import { Request, Response } from 'express';
import { query, pool } from '../db';

export const documentationController = {
  async getPages(req: Request, res: Response) {
    try {
      const { search, category, status } = req.query;

      let q = 'SELECT id, slug, title, category, overview, status, tags, search_keywords, views, likes, dislikes, created_at, updated_at FROM documentation_pages';
      const params: any[] = [];
      let paramIdx = 1;

      const whereClauses: string[] = [];

      // Filter by published status by default unless admin requests draft
      if (status) {
        whereClauses.push(`status = $${paramIdx++}`);
        params.push(status);
      } else {
        whereClauses.push(`status = 'published'`);
      }

      if (category && category !== 'All') {
        whereClauses.push(`category = $${paramIdx++}`);
        params.push(category);
      }

      if (search) {
        whereClauses.push(`(title ILIKE $${paramIdx} OR overview ILIKE $${paramIdx} OR setup_guide ILIKE $${paramIdx} OR purpose ILIKE $${paramIdx})`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (whereClauses.length > 0) {
        q += ' WHERE ' + whereClauses.join(' AND ');
      }

      q += ' ORDER BY category ASC, title ASC';

      const result = await query(q, params);

      // If database is empty, seed initial pages
      if (result.rows.length === 0 && !search && !category) {
        await seedInitialDocumentation();
        const recheck = await query(q);
        return res.json(recheck.rows);
      }

      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getPageBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const user = (req as any).user;

      const result = await query('SELECT * FROM documentation_pages WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documentation page not found' });
      }

      const page = result.rows[0];

      // Increment views count asynchronously
      query('UPDATE documentation_pages SET views = views + 1 WHERE id = $1', [page.id]).catch(console.error);

      // Track user history if authenticated
      if (user && user.id) {
        query(
          'INSERT INTO documentation_history (article_id, user_id) VALUES ($1, $2)',
          [page.id, user.id]
        ).catch(console.error);
      }

      res.json(page);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async searchPages(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);

      const result = await query(
        `SELECT id, slug, title, category, overview 
         FROM documentation_pages 
         WHERE status = 'published' AND (
           title ILIKE $1 OR 
           overview ILIKE $1 OR 
           purpose ILIKE $1 OR 
           EXISTS (SELECT 1 FROM jsonb_array_elements_text(search_keywords) AS k WHERE k ILIKE $1)
         )
         LIMIT 10`,
        [`%${q}%`]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async giveFeedback(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { helpful, comment } = req.body;
      const user = (req as any).user;

      const user_id = user?.id || null;

      await query(
        'INSERT INTO documentation_feedback (article_id, user_id, helpful, comment) VALUES ($1, $2, $3, $4)',
        [id, user_id, helpful, comment || '']
      );

      // Increment likes or dislikes
      if (helpful) {
        await query('UPDATE documentation_pages SET likes = likes + 1 WHERE id = $1', [id]);
      } else {
        await query('UPDATE documentation_pages SET dislikes = dislikes + 1 WHERE id = $1', [id]);
      }

      res.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async toggleBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const check = await query(
        'SELECT id FROM documentation_bookmarks WHERE user_id = $1 AND article_id = $2',
        [user.id, id]
      );

      if (check.rows.length > 0) {
        await query('DELETE FROM documentation_bookmarks WHERE user_id = $1 AND article_id = $2', [user.id, id]);
        return res.json({ bookmarked: false, message: 'Bookmark removed' });
      } else {
        await query('INSERT INTO documentation_bookmarks (user_id, article_id) VALUES ($1, $2)', [user.id, id]);
        return res.json({ bookmarked: true, message: 'Bookmark added' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getRecentHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await query(
        `SELECT DISTINCT ON (h.article_id) 
           h.article_id, p.title, p.slug, p.category, h.viewed_at 
         FROM documentation_history h
         JOIN documentation_pages p ON h.article_id = p.id
         WHERE h.user_id = $1
         ORDER BY h.article_id, h.viewed_at DESC
         LIMIT 5`,
        [user.id]
      );
      
      // Sort resulting rows by viewed_at desc
      const sorted = result.rows.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
      res.json(sorted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getBookmarks(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await query(
        `SELECT p.id, p.title, p.slug, p.category, p.overview, b.created_at
         FROM documentation_bookmarks b
         JOIN documentation_pages p ON b.article_id = p.id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [user.id]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createPage(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        slug, title, category, overview, purpose, features, benefits, business_use_cases,
        setup_guide, config_guide, pricing_details, billing_explanation, security_recommendations,
        performance_tips, faqs, common_errors, best_practices, related_products,
        external_references, status, tags, search_keywords, seo_settings
      } = req.body;

      const result = await query(
        `INSERT INTO documentation_pages (
          slug, title, category, overview, purpose, features, benefits, business_use_cases,
          setup_guide, config_guide, pricing_details, billing_explanation, security_recommendations,
          performance_tips, faqs, common_errors, best_practices, related_products,
          external_references, status, tags, search_keywords, seo_settings
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING *`,
        [
          slug, title, category, overview, purpose,
          JSON.stringify(features || []), JSON.stringify(benefits || []), JSON.stringify(business_use_cases || []),
          setup_guide, config_guide, JSON.stringify(pricing_details || {}), billing_explanation,
          JSON.stringify(security_recommendations || []), JSON.stringify(performance_tips || []),
          JSON.stringify(faqs || []), JSON.stringify(common_errors || []), JSON.stringify(best_practices || []),
          JSON.stringify(related_products || []), JSON.stringify(external_references || []),
          status || 'published', JSON.stringify(tags || []), JSON.stringify(search_keywords || []),
          JSON.stringify(seo_settings || {})
        ]
      );

      const newPage = result.rows[0];

      // Track version log
      await query(
        'INSERT INTO documentation_versions (article_id, title, content_json, created_by) VALUES ($1, $2, $3, $4)',
        [newPage.id, newPage.title, JSON.stringify(newPage), user?.id || null]
      );

      res.status(201).json(newPage);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updatePage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const {
        slug, title, category, overview, purpose, features, benefits, business_use_cases,
        setup_guide, config_guide, pricing_details, billing_explanation, security_recommendations,
        performance_tips, faqs, common_errors, best_practices, related_products,
        external_references, status, tags, search_keywords, seo_settings
      } = req.body;

      const result = await query(
        `UPDATE documentation_pages SET 
          slug = COALESCE($1, slug),
          title = COALESCE($2, title),
          category = COALESCE($3, category),
          overview = COALESCE($4, overview),
          purpose = COALESCE($5, purpose),
          features = COALESCE($6, features),
          benefits = COALESCE($7, benefits),
          business_use_cases = COALESCE($8, business_use_cases),
          setup_guide = COALESCE($9, setup_guide),
          config_guide = COALESCE($10, config_guide),
          pricing_details = COALESCE($11, pricing_details),
          billing_explanation = COALESCE($12, billing_explanation),
          security_recommendations = COALESCE($13, security_recommendations),
          performance_tips = COALESCE($14, performance_tips),
          faqs = COALESCE($15, faqs),
          common_errors = COALESCE($16, common_errors),
          best_practices = COALESCE($17, best_practices),
          related_products = COALESCE($18, related_products),
          external_references = COALESCE($19, external_references),
          status = COALESCE($20, status),
          tags = COALESCE($21, tags),
          search_keywords = COALESCE($22, search_keywords),
          seo_settings = COALESCE($23, seo_settings),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $24 RETURNING *`,
        [
          slug, title, category, overview, purpose,
          features ? JSON.stringify(features) : null,
          benefits ? JSON.stringify(benefits) : null,
          business_use_cases ? JSON.stringify(business_use_cases) : null,
          setup_guide, config_guide,
          pricing_details ? JSON.stringify(pricing_details) : null,
          billing_explanation,
          security_recommendations ? JSON.stringify(security_recommendations) : null,
          performance_tips ? JSON.stringify(performance_tips) : null,
          faqs ? JSON.stringify(faqs) : null,
          common_errors ? JSON.stringify(common_errors) : null,
          best_practices ? JSON.stringify(best_practices) : null,
          related_products ? JSON.stringify(related_products) : null,
          external_references ? JSON.stringify(external_references) : null,
          status,
          tags ? JSON.stringify(tags) : null,
          search_keywords ? JSON.stringify(search_keywords) : null,
          seo_settings ? JSON.stringify(seo_settings) : null,
          id
        ]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
      const updatedPage = result.rows[0];

      // Track version log
      await query(
        'INSERT INTO documentation_versions (article_id, title, content_json, created_by) VALUES ($1, $2, $3, $4)',
        [updatedPage.id, updatedPage.title, JSON.stringify(updatedPage), user?.id || null]
      );

      res.json(updatedPage);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async deletePage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await query('DELETE FROM documentation_pages WHERE id = $1', [id]);
      res.json({ success: (result.rowCount || 0) > 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT v.id, v.title, v.created_at, u.data->>'fullName' as author_name 
         FROM documentation_versions v
         LEFT JOIN records u ON v.created_by = u.id AND u.collection = 'users'
         WHERE v.article_id = $1
         ORDER BY v.created_at DESC`,
        [id]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async rollbackVersion(req: Request, res: Response) {
    try {
      const { id, versionId } = req.params;
      
      const vResult = await query('SELECT content_json FROM documentation_versions WHERE id = $1', [versionId]);
      if (vResult.rows.length === 0) return res.status(404).json({ error: 'Version not found' });
      
      const doc = vResult.rows[0].content_json;
      
      await query(
        `UPDATE documentation_pages SET
          slug = $1, title = $2, category = $3, overview = $4, purpose = $5,
          features = $6, benefits = $7, business_use_cases = $8, setup_guide = $9,
          config_guide = $10, pricing_details = $11, billing_explanation = $12,
          security_recommendations = $13, performance_tips = $14, faqs = $15,
          common_errors = $16, best_practices = $17, related_products = $18,
          external_references = $19, status = $20, tags = $21, search_keywords = $22,
          seo_settings = $23, updated_at = CURRENT_TIMESTAMP
         WHERE id = $24`,
        [
          doc.slug, doc.title, doc.category, doc.overview, doc.purpose,
          JSON.stringify(doc.features || []), JSON.stringify(doc.benefits || []), JSON.stringify(doc.business_use_cases || []),
          doc.setup_guide, doc.config_guide, JSON.stringify(doc.pricing_details || {}), doc.billing_explanation,
          JSON.stringify(doc.security_recommendations || []), JSON.stringify(doc.performance_tips || []),
          JSON.stringify(doc.faqs || []), JSON.stringify(doc.common_errors || []), JSON.stringify(doc.best_practices || []),
          JSON.stringify(doc.related_products || []), JSON.stringify(doc.external_references || []),
          doc.status, JSON.stringify(doc.tags || []), JSON.stringify(doc.search_keywords || []),
          JSON.stringify(doc.seo_settings || {}), id
        ]
      );
      
      res.json({ success: true, message: 'Version rolled back successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};

async function seedInitialDocumentation() {
  const docs = [
    {
      slug: 'getting-started-overview',
      title: 'Getting Started: Platform Overview',
      category: 'Getting Started',
      overview: 'Welcome to AJR Digital HUB. Acquire, provision, monitor, and scale your digital assets from a unified master dashboard.',
      purpose: 'To provide a unified cloud architecture enabling businesses to launch automated applications, manage billing logs, and synchronize campaign APIs.',
      features: ['One-click application onboarding', 'Automated metered usage billing', 'Granular role access delegation'],
      benefits: ['Consolidate operations: Zero context-switching', 'Predictable budgets: Visual cost simulators', 'Enterprise security: OAuth token rotations'],
      business_use_cases: ['Agencies scaling landing pages for multiple client tiers', 'Retail platforms syncing bulk WhatsApp notifications'],
      setup_guide: '1. Log in to AJR Digital HUB dashboard using credentials.\n2. Navigate to Tenant Settings and select your subscription tier.\n3. Configure SMTP and Firebase keys to start provisioning application nodes.',
      config_guide: 'Set environment keys inside apphosting.yaml to target cluster coordinates.',
      pricing_details: { basePrice: 1500, freeTier: 10, excessRate: 50 },
      billing_explanation: 'Standard access fees are charged monthly. Provisioned nodes and metrics consumption incur hourly resource tracking.',
      security_recommendations: ['Enable App Check validation', 'Restrict CORS configuration limits'],
      performance_tips: ['Cache dashboard stats in Redis clusters', 'Lazy-load analytics scripts'],
      faqs: [{ q: 'Can I change plans anytime?', a: 'Yes, quota limits scale dynamically upon upgrading/downgrading from billing hub.' }],
      common_errors: [{ code: 'AUTH_001', desc: 'Invalid session credentials', resolution: 'Relog or check environment keys configuration.' }],
      best_practices: ['Use client-specific workspaces to isolate billing details', 'Rotate API tokens monthly'],
      related_products: ['marketplace-overview'],
      external_references: [{ name: 'Firebase Console Guide', url: 'https://firebase.google.com/docs' }]
    },
    {
      slug: 'whatsapp-marketing-cloud',
      title: 'WhatsApp Cloud API Configuration',
      category: 'WhatsApp Marketing',
      overview: 'Configure WhatsApp Business templates and broadcast campaign messages utilizing Meta Developers Cloud API.',
      purpose: 'Automate customer support notifications and broadcast template marketing alerts with verified read receipts.',
      features: ['Official Business Profile syncing', 'Interactive template builder', 'Live read/delivery status reports'],
      benefits: ['98% open rates over normal email campaigns', 'Automated retry queues for offline recipients', 'Zero spam triggers'],
      business_use_cases: ['Automatic payment notifications with pdf invoice link attachments', 'Bulk campaign marketing broadcasts'],
      setup_guide: '1. Create a Meta Developer App and add WhatsApp Cloud API product.\n2. Link your WhatsApp Business account (WABA) and copy Phone Number ID.\n3. Insert WABA token into AJR Hub Integrations panel.',
      config_guide: 'Webhook configuration URL: https://api.ajr.hub/v1/whatsapp/webhook. Secret verification token: AJR_WEBHOOK_VERIFY.',
      pricing_details: { basePrice: 2000, freeTier: 100, excessRate: 0.8 },
      billing_explanation: 'Charged per 24-hour conversation window based on recipient country rates set by Meta.',
      security_recommendations: ['Do not store static access tokens in public repositories', 'Rotate system keys quarterly'],
      performance_tips: ['Compress image attachments below 5MB', 'Process bulk campaign broadcasts using node queues'],
      faqs: [{ q: 'Are templates checked by Meta?', a: 'Yes, Meta automatically reviews templates for content quality within 2 hours.' }],
      common_errors: [{ code: 'META_400', desc: 'Expired temporary token', resolution: 'Replace your temporary access token with a permanent system user token.' }],
      best_practices: ['Insert personalized variables inside template parameters', 'Obtain explicit user opt-in before messaging'],
      related_products: ['invoice-whatsapp-sharing'],
      external_references: [{ name: 'Meta Cloud API Docs', url: 'https://developers.facebook.com/docs/whatsapp' }]
    },
    {
      slug: 'google-ads-integration',
      title: 'Google Ads API Setup & Campaigns',
      category: 'Google Ads',
      overview: 'Sync and manage search ad groups, campaign budgets, and real-time conversion telemetry from your AJR dashboard.',
      purpose: 'Eliminate duplicate agency configuration dashboards and display cross-channel ROI figures inside standard client templates.',
      features: ['Live campaign ROI trackers', 'Keyword bid optimization assistant', 'OAuth account handshake logs'],
      benefits: ['Identifies underperforming ad keywords instantly', 'Simplifies multi-tenant advertiser authorization flows'],
      business_use_cases: ['Tracking user lead conversion stats relative to specific Google Ads keywords'],
      setup_guide: '1. Go to Google API Console and create Google Ads API credentials.\n2. Execute OAuth login link inside AJR Integrations.\n3. Input Developer Token and customer ID values.',
      config_guide: 'Provide write access permissions on OAuth scopes to sync new ad groups.',
      pricing_details: { basePrice: 2500, freeTier: 0, excessRate: 0.05 },
      billing_explanation: 'Platform base integration fee applies. Google Ads budget spend is charged directly to your Google billing method.',
      security_recommendations: ['Use granular IAM scopes when authenticating client portals'],
      performance_tips: ['Sync campaign report data asynchronously using hourly cron schedules'],
      faqs: [{ q: 'How often do campaign stats sync?', a: 'Ad metrics are updated in 15-minute intervals.' }],
      common_errors: [{ code: 'G_ADS_403', desc: 'Invalid Developer Token permission', resolution: 'Request token validation upgrade to Basic Access.' }],
      best_practices: ['Configure conversions on thank-you page routes to track actual sales value'],
      related_products: ['analytics-overview'],
      external_references: [{ name: 'Google Ads API reference', url: 'https://developers.google.com/google-ads/api/docs' }]
    }
  ];

  for (const doc of docs) {
    try {
      await query(
        `INSERT INTO documentation_pages (
          slug, title, category, overview, purpose, features, benefits, business_use_cases,
          setup_guide, config_guide, pricing_details, billing_explanation, security_recommendations,
          performance_tips, faqs, common_errors, best_practices, related_products, external_references, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (slug) DO UPDATE SET 
           title = EXCLUDED.title, category = EXCLUDED.category, overview = EXCLUDED.overview, purpose = EXCLUDED.purpose,
           features = EXCLUDED.features, benefits = EXCLUDED.benefits, business_use_cases = EXCLUDED.business_use_cases,
           setup_guide = EXCLUDED.setup_guide, config_guide = EXCLUDED.config_guide, pricing_details = EXCLUDED.pricing_details,
           billing_explanation = EXCLUDED.billing_explanation, security_recommendations = EXCLUDED.security_recommendations,
           performance_tips = EXCLUDED.performance_tips, faqs = EXCLUDED.faqs, common_errors = EXCLUDED.common_errors,
           best_practices = EXCLUDED.best_practices, related_products = EXCLUDED.related_products,
           external_references = EXCLUDED.external_references`,
        [
          doc.slug, doc.title, doc.category, doc.overview, doc.purpose,
          JSON.stringify(doc.features), JSON.stringify(doc.benefits), JSON.stringify(doc.business_use_cases),
          doc.setup_guide, doc.config_guide, JSON.stringify(doc.pricing_details), doc.billing_explanation,
          JSON.stringify(doc.security_recommendations), JSON.stringify(doc.performance_tips),
          JSON.stringify(doc.faqs), JSON.stringify(doc.common_errors), JSON.stringify(doc.best_practices),
          JSON.stringify(doc.related_products), JSON.stringify(doc.external_references), 'published'
        ]
      );
    } catch (e) {
      console.error('Failed to seed detailed doc page:', doc.slug, e);
    }
  }
}
