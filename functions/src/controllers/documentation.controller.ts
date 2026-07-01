import { Request, Response } from 'express';
import { query, pool } from '../db';

export const documentationController = {
  async getPages(req: Request, res: Response) {
    try {
      if (!pool) return res.json([]);
      const { search, category } = req.query;

      let q = 'SELECT id, slug, title, category, overview FROM documentation_pages';
      const params: any[] = [];
      let paramIdx = 1;

      const whereClauses: string[] = [];

      if (category) {
        whereClauses.push(`category = $${paramIdx++}`);
        params.push(category);
      }

      if (search) {
        whereClauses.push(`(title ILIKE $${paramIdx} OR overview ILIKE $${paramIdx} OR setup_guide ILIKE $${paramIdx})`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (whereClauses.length > 0) {
        q += ' WHERE ' + whereClauses.join(' AND ');
      }

      q += ' ORDER BY title ASC';

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
      const result = await query('SELECT * FROM documentation_pages WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documentation page not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createPage(req: Request, res: Response) {
    try {
      const {
        slug, title, category, overview, features, benefits, screenshots, videos, workflow_diagrams, api_flow,
        setup_guide, config_guide, pricing_details, faqs, common_errors, best_practices, related_products
      } = req.body;

      const result = await query(
        `INSERT INTO documentation_pages (
          slug, title, category, overview, features, benefits, screenshots, videos, workflow_diagrams, api_flow,
          setup_guide, config_guide, pricing_details, faqs, common_errors, best_practices, related_products
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
        [
          slug, title, category, overview, 
          JSON.stringify(features || []), JSON.stringify(benefits || []), JSON.stringify(screenshots || []), 
          JSON.stringify(videos || []), JSON.stringify(workflow_diagrams || []), JSON.stringify(api_flow || []),
          setup_guide, config_guide, JSON.stringify(pricing_details || {}), JSON.stringify(faqs || []), 
          JSON.stringify(common_errors || []), JSON.stringify(best_practices || []), JSON.stringify(related_products || [])
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updatePage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        slug, title, category, overview, features, benefits, screenshots, videos, workflow_diagrams, api_flow,
        setup_guide, config_guide, pricing_details, faqs, common_errors, best_practices, related_products
      } = req.body;

      const result = await query(
        `UPDATE documentation_pages SET 
          slug = COALESCE($1, slug),
          title = COALESCE($2, title),
          category = COALESCE($3, category),
          overview = COALESCE($4, overview),
          features = COALESCE($5, features),
          benefits = COALESCE($6, benefits),
          screenshots = COALESCE($7, screenshots),
          videos = COALESCE($8, videos),
          workflow_diagrams = COALESCE($9, workflow_diagrams),
          api_flow = COALESCE($10, api_flow),
          setup_guide = COALESCE($11, setup_guide),
          config_guide = COALESCE($12, config_guide),
          pricing_details = COALESCE($13, pricing_details),
          faqs = COALESCE($14, faqs),
          common_errors = COALESCE($15, common_errors),
          best_practices = COALESCE($16, best_practices),
          related_products = COALESCE($17, related_products),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $18 RETURNING *`,
        [
          slug, title, category, overview,
          features ? JSON.stringify(features) : null,
          benefits ? JSON.stringify(benefits) : null,
          screenshots ? JSON.stringify(screenshots) : null,
          videos ? JSON.stringify(videos) : null,
          workflow_diagrams ? JSON.stringify(workflow_diagrams) : null,
          api_flow ? JSON.stringify(api_flow) : null,
          setup_guide, config_guide,
          pricing_details ? JSON.stringify(pricing_details) : null,
          faqs ? JSON.stringify(faqs) : null,
          common_errors ? JSON.stringify(common_errors) : null,
          best_practices ? JSON.stringify(best_practices) : null,
          related_products ? JSON.stringify(related_products) : null,
          id
        ]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
      res.json(result.rows[0]);
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
  }
};

async function seedInitialDocumentation() {
  const initialDocs = [
    {
      slug: 'whatsapp-bulk-marketing',
      title: 'WhatsApp Bulk Marketing',
      category: 'WhatsApp',
      overview: 'Reach thousands of clients instantly using bulk messaging templates over the Meta Cloud API.',
      features: ['Broadcast messages in 1 click', 'Custom parameters injection', 'Meta approved templates sync'],
      benefits: ['98% open rates', 'Zero spam flags using official business account API', 'Instant template status checks'],
      setup_guide: '1. Register on Meta Developer Portal\n2. Add WhatsApp business products to your app\n3. Copy the phone number ID and WABA token to AJR HUB Integrations.',
      config_guide: 'Set your headers to target `whatsapp_config` table attributes. Keep token active by configuring OAuth token refreshing.',
      pricing_details: { basePrice: 1500, freeTier: 100, excessRate: 0.8 },
      faqs: [{ q: 'Will my number get blocked?', a: 'No, this service uses the official Meta Cloud API which bypasses block triggers.' }]
    },
    {
      slug: 'google-ads',
      title: 'Google Ads campaigns',
      category: 'Marketing',
      overview: 'Direct control over Google Search and Display ads, bidding strategies, budget allocations, and performance tracking.',
      features: ['Pause/Resume campaigns from dashboard', 'Keyword planner integration', 'Real-time ROI dashboard'],
      benefits: ['Saves 25% of redundant ad spend', 'Automated campaign optimization alerts', 'Centrally managed multi-tenant access'],
      setup_guide: '1. Connect Google Ads account via OAuth\n2. Authorize client access using Developer Token\n3. Set budget rules.',
      config_guide: 'Add Google Manager CID inside customer integrations configuration panel.',
      pricing_details: { basePrice: 2500, freeTier: 0, excessRate: 0.05 },
      faqs: [{ q: 'How does live data sync?', a: 'We call the official Google Ads API every 15 minutes to synchronize metrics.' }]
    },
    {
      slug: 'invoice-generator',
      title: 'Invoice Generator',
      category: 'Billing',
      overview: 'Generate professional invoices, configure GST rules, apply discounts, and generate printable HTML or PDF templates.',
      features: ['Automated GST calculations', 'HTML to PDF Puppeteer rendering', 'Automated WhatsApp PDF reminders'],
      benefits: ['Reduces payment collection delays by 40%', 'Completely paperless compliance archiving', 'Brand customization layouts'],
      setup_guide: '1. Upload your company logo\n2. Save company billing address details\n3. Configure default tax values.',
      config_guide: 'Configure standard billing HTML templates from template builder.',
      pricing_details: { basePrice: 500, freeTier: 50, excessRate: 5.0 },
      faqs: [{ q: 'Can I download previous invoices?', a: 'Yes, all invoices are saved in secure Firebase Cloud Storage buckets and are available for download.' }]
    }
  ];

  for (const doc of initialDocs) {
    try {
      await query(
        `INSERT INTO documentation_pages (slug, title, category, overview, features, benefits, setup_guide, config_guide, pricing_details, faqs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (slug) DO NOTHING`,
        [
          doc.slug, doc.title, doc.category, doc.overview,
          JSON.stringify(doc.features), JSON.stringify(doc.benefits),
          doc.setup_guide, doc.config_guide, JSON.stringify(doc.pricing_details), JSON.stringify(doc.faqs)
        ]
      );
    } catch (e) {
      console.error('Failed to seed doc page:', doc.slug, e);
    }
  }
}
