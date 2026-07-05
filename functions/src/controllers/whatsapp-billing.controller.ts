import { Request, Response } from 'express';
import { query } from '../db';
import { decryptValue } from '../utils/crypto';
import { whatsappCloudService } from '../services/whatsappCloud.service';
import { firestore } from '../config/firebase';

// ────────────────────────────────────────────────────────────────────────────
//  Pricing matrix (Meta WhatsApp Business Messaging)
// ────────────────────────────────────────────────────────────────────────────
export const METADATA_PRICING_TABLE: Record<string, Record<string, { price: number; currency: string }>> = {
  IN: {
    utility: { price: 0.11255, currency: 'INR' },
    marketing: { price: 0.86, currency: 'INR' },
    authentication: { price: 0.09, currency: 'INR' },
    service: { price: 0.05, currency: 'INR' }
  },
  US: {
    utility: { price: 0.015, currency: 'USD' },
    marketing: { price: 0.025, currency: 'USD' },
    authentication: { price: 0.0135, currency: 'USD' },
    service: { price: 0.0088, currency: 'USD' }
  },
  GB: {
    utility: { price: 0.033, currency: 'GBP' },
    marketing: { price: 0.065, currency: 'GBP' },
    authentication: { price: 0.031, currency: 'GBP' },
    service: { price: 0.022, currency: 'GBP' }
  }
};

export function getCountryCode(phone: string): string {
  if (!phone) return 'IN';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('91')) return 'IN';
  if (clean.startsWith('1')) return 'US';
  if (clean.startsWith('44')) return 'GB';
  return 'IN';
}

function calculateConversationPrice(category: string, phone: string): { price: number; currency: string } {
  const country = getCountryCode(phone);
  const cat = (category || 'utility').toLowerCase();
  const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];
  return rates[cat] || { price: 0.11255, currency: 'INR' };
}

function parseMetaDateString(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const isSeconds = val < 99999999999;
    const d = new Date(isSeconds ? val * 1000 : val);
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== '') {
      const isSeconds = num < 99999999999;
      const d = new Date(isSeconds ? num * 1000 : num);
      return d.toISOString().split('T')[0];
    }
    return val.split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

async function aggregateFromFirebase(appId: string, days: number): Promise<Record<string, { sent: number; delivered: number; read: number; failed: number; cost: number }>> {
  const statsMap: Record<string, { sent: number; delivered: number; read: number; failed: number; cost: number }> = {};
  if (!firestore) return statsMap;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await firestore.collection('whatsapp_message_logs')
      .where('appId', '==', appId)
      .where('timestamp', '>=', startDate)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const templateName = data.templateName || 'unknown';
      const status = data.status || 'sent';
      const docCost = Number(data.cost || 0);

      if (!statsMap[templateName]) {
        statsMap[templateName] = { sent: 0, delivered: 0, read: 0, failed: 0, cost: 0 };
      }

      statsMap[templateName].cost += docCost;

      if (status === 'read') {
        statsMap[templateName].sent++;
        statsMap[templateName].delivered++;
        statsMap[templateName].read++;
      } else if (status === 'delivered') {
        statsMap[templateName].sent++;
        statsMap[templateName].delivered++;
      } else if (status === 'sent') {
        statsMap[templateName].sent++;
      } else if (status === 'failed') {
        statsMap[templateName].sent++;
        statsMap[templateName].failed++;
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Controller Fallback] Firestore aggregation failed:', err.message);
  }

  return statsMap;
}

// ────────────────────────────────────────────────────────────────────────────
//  Helper: fetch decrypted WhatsApp config (WABA_ID + token) for an app
// ────────────────────────────────────────────────────────────────────────────
async function getWhatsAppConfigDecrypted(appId: string): Promise<{
  wabaId: string;
  token: string;
  phoneId: string;
} | null> {
  try {
    const res = await query(
      `SELECT api_key as token, waba_id, phone_number as phone_id, enabled FROM whatsapp_config WHERE app_id = $1`,
      [appId]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (!row.enabled) {
        return null;
      }
      const decryptedToken = decryptValue(row.token || '');
      if (decryptedToken && row.waba_id) {
        return {
          wabaId: row.waba_id || '',
          token: decryptedToken || '',
          phoneId: row.phone_id || '',
        };
      }
    }
  } catch (err: any) {
    console.error(`[WhatsApp] Failed to query DB config for ${appId}:`, err.message);
  }
  return null;
}

/**
 * Handle Meta API or credentials loading errors
 */
function handleControllerError(err: any, res: Response) {
  console.error('[WhatsApp Billing API Error]:', err.message);

  let errorType = 'UNKNOWN';
  if (err.message.includes('AUTHENTICATION_ERROR')) {
    errorType = 'AUTHENTICATION_ERROR';
  } else if (err.message.includes('PERMISSION_ERROR')) {
    errorType = 'PERMISSION_ERROR';
  } else if (err.message.includes('META_API_ERROR')) {
    errorType = 'META_API_ERROR';
  }

  return res.status(400).json({
    error: err.message,
    errorType,
    message: err.message
  });
}

// ────────────────────────────────────────────────────────────────────────────
//  CONTROLLER EXPORTS
// ────────────────────────────────────────────────────────────────────────────
export const whatsappBillingController = {

  /**
   * GET /api/admin/apps/:id/whatsapp/realtime-summary
   */
  async getRealtimeSummary(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const days = Number(req.query['days']) || 30;
      const bypassCache = req.query['refresh'] === 'true';

      const config = await getWhatsAppConfigDecrypted(id);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      // Check permissions gracefully instead of throwing hard error
      let checkPerms = { granted: [] as string[], missing: [] as string[] };
      try {
        checkPerms = await whatsappCloudService.checkPermissions(config.token);
      } catch (permErr: any) {
        console.warn('[WhatsApp Controller] Failed to check permissions:', permErr.message);
      }

      // Fetch basic metadata from Meta with individual try-catches
      let wabaDetails: any = {};
      let phoneDetails: any = {};

      try {
        wabaDetails = await whatsappCloudService.getWabaDetails(config.wabaId, config.token, bypassCache);
      } catch (err: any) {
        console.warn('[WhatsApp Controller] getWabaDetails failed:', err.message);
      }

      try {
        phoneDetails = await whatsappCloudService.getPhoneNumberDetails(config.phoneId, config.token, bypassCache);
      } catch (err: any) {
        console.warn('[WhatsApp Controller] getPhoneNumberDetails failed:', err.message);
      }

      const currency = wabaDetails?.currency || 'INR';

      // Timestamps for pricing and template analytics
      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - days * 24 * 3600;

      // Query template and pricing analytics with error isolation
      let marketingCost = 0, marketingVol = 0;
      let utilityCost = 0, utilityVol = 0;
      let authCost = 0, authVol = 0;
      let serviceCost = 0, serviceVol = 0;
      let regularVol = 0, freeVol = 0;
      let totalCost: number | null = 0;

      let pricingMetricsAvailable = true;
      let pricingMetricsReason = '';
      let pricingAnalytics: any[] = [];

      try {
        pricingAnalytics = await whatsappCloudService.getPricingAnalytics(
          config.wabaId,
          config.token,
          startEpoch,
          endEpoch,
          'DAILY',
          bypassCache
        );

        for (const item of pricingAnalytics) {
          if (!item.values) continue;
          for (const val of item.values) {
            const dim = val.dimension;
            const cat = val.value;

            if (dim === 'PRICING_CATEGORY') {
              const costMetric = val.metric_types?.find((m: any) => m.type === 'COST');
              const volMetric = val.metric_types?.find((m: any) => m.type === 'VOLUME');
              const costVal = Number(costMetric?.value || 0);
              const volVal = Number(volMetric?.value || 0);

              if (cat === 'MARKETING') { marketingCost += costVal; marketingVol += volVal; }
              else if (cat === 'UTILITY') { utilityCost += costVal; utilityVol += volVal; }
              else if (cat === 'AUTHENTICATION') { authCost += costVal; authVol += volVal; }
              else if (cat === 'SERVICE') { serviceCost += costVal; serviceVol += volVal; }
            } else if (dim === 'PRICING_TYPE') {
              const volMetric = val.metric_types?.find((m: any) => m.type === 'VOLUME');
              const volVal = Number(volMetric?.value || 0);
              if (cat === 'REGULAR') {
                regularVol += volVal;
              } else {
                freeVol += volVal;
              }
            }
          }
        }
        totalCost = marketingCost + utilityCost + authCost + serviceCost;
      } catch (err: any) {
        pricingMetricsAvailable = false;
        pricingMetricsReason = err.message || 'Pricing metrics not returned by Meta API';
        totalCost = null;
      }

      // Aggregate template performance metrics
      let totalSent: number | null = 0;
      let totalDelivered: number | null = 0;
      let totalRead: number | null = 0;
      let totalFailed: number | null = 0;

      let templateMetricsAvailable = true;
      let templateMetricsReason = '';
      let templateAnalytics: any[] = [];
      let metaTemplates: any[] = [];

      try {
        templateAnalytics = await whatsappCloudService.getTemplateAnalytics(
          config.wabaId,
          config.token,
          startEpoch,
          endEpoch,
          'DAILY',
          bypassCache
        );

        for (const item of templateAnalytics) {
          // console.log("PRICCC**", item);
          if (!item.data_points) continue;
          for (const dp of item.data_points) {
            totalSent! += Number(dp.sent || 0);
            totalDelivered! += Number(dp.delivered || 0);
            totalRead! += Number(dp.read || 0);
            totalFailed! += Number(dp.failed || 0);
          }
        }
      } catch (err: any) {
        templateMetricsAvailable = false;
        templateMetricsReason = err.message || 'Template analytics metrics not returned by Meta API';
        totalSent = null;
        totalDelivered = null;
        totalRead = null;
        totalFailed = null;
      }

      if ((!templateMetricsAvailable || totalSent === 0) && firestore) {
        console.log(`[WhatsApp Billing Summary] Meta Graph API returned no template metrics. Aggregating from Firebase...`);
        try {
          const fbStats = await aggregateFromFirebase(id, days);
          let fbSent = 0, fbDelivered = 0, fbRead = 0, fbFailed = 0;
          for (const key of Object.keys(fbStats)) {
            fbSent += fbStats[key].sent;
            fbDelivered += fbStats[key].delivered;
            fbRead += fbStats[key].read;
            fbFailed += fbStats[key].failed;
          }
          if (fbSent > 0 || fbDelivered > 0 || fbRead > 0 || fbFailed > 0) {
            totalSent = fbSent;
            totalDelivered = fbDelivered;
            totalRead = fbRead;
            totalFailed = fbFailed;
            templateMetricsAvailable = true;
          }
        } catch (fbErr: any) {
          console.error('[WhatsApp Billing Summary Fallback] Firebase aggregation failed:', fbErr.message);
        }
      }

      // Estimate costs locally using pricing logic if Meta did not return non-zero pricing
      let estimatedCost = 0;
      let calculatedFallback = false;
      const phoneNum = phoneDetails?.display_phone_number || '';
      const country = getCountryCode(phoneNum);
      const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];

      if (pricingMetricsAvailable && totalCost !== null && totalCost > 0) {
        estimatedCost = totalCost;
      } else {
        // Try calculating using pricing analytics volume first
        let hasPricingVol = false;
        if (pricingMetricsAvailable && pricingAnalytics.length > 0) {
          let calcCost = 0;
          for (const item of pricingAnalytics) {
            if (!item.values) continue;
            for (const val of item.values) {
              if (val.dimension === 'PRICING_CATEGORY') {
                const cat = val.value?.toLowerCase();
                const volMetric = val.metric_types?.find((m: any) => m.type === 'VOLUME');
                const volVal = Number(volMetric?.value || 0);
                if (volVal > 0) {
                  hasPricingVol = true;
                  const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;
                  calcCost += volVal * rate;
                }
              }
            }
          }
          if (hasPricingVol) {
            estimatedCost = calcCost;
            calculatedFallback = true;
          }
        }

        // If no volume from pricing analytics (or pricing analytics failed), try template analytics
        if (!calculatedFallback && templateMetricsAvailable && templateAnalytics.length > 0) {
          let calcCost = 0;
          try {
            metaTemplates = await whatsappCloudService.getMessageTemplates(config.wabaId, config.token, bypassCache);
          } catch (err) {
            console.warn('Failed to fetch message templates for summary fallback:', err);
          }
          const templateCategoryMap: Record<string, string> = {};
          for (const t of metaTemplates) {
            if (t.id) templateCategoryMap[t.id] = t.category;
            if (t.name) templateCategoryMap[t.name] = t.category;
          }

          for (const item of templateAnalytics) {
            const itemTemplateId = item.template_id || (item.template_ids && item.template_ids[0]);
            const cat = (templateCategoryMap[itemTemplateId] || templateCategoryMap[item.name] || 'utility').toLowerCase();
            const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;
            if (item.data_points) {
              for (const dp of item.data_points) {
                const delivered = Number(dp.delivered || 0);
                calcCost += delivered * rate;
              }
            }
          }
          estimatedCost = calcCost;
          calculatedFallback = true;
        }

        // Fallback 3: Calculate using local PostgreSQL notification_logs
        if (!calculatedFallback) {
          try {
            const dbLogs = await query(
              `SELECT event_type as template, status, COUNT(*) as count
               FROM notification_logs
               WHERE channel = 'whatsapp'
                 AND app_id = $1
                 AND created_at >= NOW() - CAST($2 || ' days' AS INTERVAL)
               GROUP BY event_type, status`,
              [id, days]
            );

            let calcCost = 0;
            for (const row of dbLogs.rows) {
              const name = row.template || '';
              const status = row.status;
              const count = parseInt(row.count || '0', 10);
              if (status === 'failed') continue;

              const cat = (name === 'task_status_update' || name === 'order_confirmation_admin' || name === 'welcome_message' || name === 'get_offers') ? 'marketing' : 'utility';
              const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;
              calcCost += count * rate;
            }
            if (calcCost > 0) {
              estimatedCost = calcCost;
              calculatedFallback = true;
            }
          } catch (dbErr) {
            console.error('Failed to calculate fallback cost from notification_logs:', dbErr);
          }
        }
      }

      const readRate = templateMetricsAvailable && totalDelivered !== null && totalDelivered > 0
        ? Math.round((totalRead! / totalDelivered!) * 100)
        : null;
      const deliveryRate = templateMetricsAvailable && totalSent !== null && totalSent > 0
        ? Math.round((totalDelivered! / totalSent!) * 100)
        : null;

      const responseSummary = {
        messagesSent: templateMetricsAvailable ? totalSent : { available: false, reason: templateMetricsReason },
        messagesDelivered: templateMetricsAvailable ? totalDelivered : { available: false, reason: templateMetricsReason },
        messagesRead: templateMetricsAvailable ? totalRead : { available: false, reason: templateMetricsReason },
        messagesFailed: templateMetricsAvailable ? totalFailed : { available: false, reason: templateMetricsReason },
        totalMessages: templateMetricsAvailable ? totalDelivered : { available: false, reason: templateMetricsReason },
        deliveryRate: templateMetricsAvailable ? deliveryRate : { available: false, reason: templateMetricsReason },
        readRate: templateMetricsAvailable ? readRate : { available: false, reason: templateMetricsReason },
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        currency,
        monthlyEstimate: Math.round(estimatedCost * (30 / days) * 100) / 100,
        aiCostPrediction: Math.round(estimatedCost * (30 / days) * 1.05 * 100) / 100,
        period: `${days}d`,
        lastUpdated: new Date().toISOString(),
        dataSource: 'meta_api'
      };

      console.log('[WhatsApp Billing Summary Final Response]:', JSON.stringify(responseSummary));
      return res.json(responseSummary);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * GET /api/admin/apps/:id/whatsapp/templates-live
   */
  async getTemplatesLive(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const days = Number(req.query['days']) || 30;
      const bypassCache = req.query['refresh'] === 'true';

      const config = await getWhatsAppConfigDecrypted(id);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      // Check permissions gracefully instead of throwing hard error
      let checkPerms = { granted: [] as string[], missing: [] as string[] };
      try {
        checkPerms = await whatsappCloudService.checkPermissions(config.token);
      } catch (permErr: any) {
        console.warn('[WhatsApp Controller] Failed to check permissions:', permErr.message);
      }

      const phone = config.phoneId;
      const metaTemplates = await whatsappCloudService.getMessageTemplates(config.wabaId, config.token, bypassCache);

      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - days * 24 * 3600;

      let templateMetricsAvailable = true;
      let templateAnalytics: any[] = [];
      try {
        templateAnalytics = await whatsappCloudService.getTemplateAnalytics(config.wabaId, config.token, startEpoch, endEpoch, 'DAILY', bypassCache);
      } catch (err: any) {
        templateMetricsAvailable = false;
        console.warn('[WhatsApp Billing] Template performance metrics not available:', err.message);
      }
      // ... [rest of getTemplatesLive] ...
      let statsMap: Record<string, { sent: number; delivered: number; read: number; failed: number; cost: number }> = {};
      if (templateMetricsAvailable) {
        console.log('[DEBUG WhatsApp Billing] Total metaTemplates fetched:', metaTemplates.length);
        console.log('[DEBUG WhatsApp Billing] metaTemplates list:', JSON.stringify(metaTemplates.map((m: any) => ({ id: m.id, name: m.name }))));
        console.log('[DEBUG WhatsApp Billing] templateAnalytics list:', JSON.stringify(templateAnalytics.map((a: any) => ({ template_id: a.template_id, template_ids: a.template_ids, name: a.name }))));

        for (const t of templateAnalytics) {
          const templateIdFromAnalytics = t.template_id || 
            (t.template_ids && t.template_ids[0]) || 
            (t.data_points && t.data_points[0] && t.data_points[0].template_id);

          const matched = metaTemplates.find((mt: any) => 
            (mt.id && String(mt.id) === String(templateIdFromAnalytics)) || 
            (mt.name && t.name && mt.name === t.name)
          );
          const name = matched?.name || t.name;
          if (!name) continue;
          let sent = 0, delivered = 0, read = 0, failed = 0, cost = 0;
          if (t.data_points) {
            for (const dp of t.data_points) {
              sent += Number(dp.sent || 0);
              delivered += Number(dp.delivered || 0);
              read += Number(dp.read || 0);
              failed += Number(dp.failed || 0);

              if (dp.cost) {
                const spentObj = dp.cost.find((c: any) => c.type === 'amount_spent');
                if (spentObj && spentObj.value !== undefined) {
                  cost += Number(spentObj.value);
                }
              }
            }
          }
          if (sent > 0 || delivered > 0 || read > 0 || failed > 0) {
            statsMap[name] = { sent, delivered, read, failed, cost };
          }
        }
      }

      const hasMetaStats = Object.keys(statsMap).length > 0;
      if (!hasMetaStats) {
        console.log(`[WhatsApp Billing] Meta Graph API returned no template-level analytics for app ${id}. Querying Firebase fallback...`);
        statsMap = await aggregateFromFirebase(id, days);
      }

      // console.log("Templatess((((((())))))))))", metaTemplates);
      const merged = metaTemplates.map((t: any) => {
        const name = t.name;
        const stats = statsMap[name];
        const cat = (t.category || 'utility').toLowerCase();
        const price = calculateConversationPrice(cat, phone).price;

        let readRate = null;
        let deliveryRate = null;
        let finalCost = 0;
        if (stats) {
          readRate = stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;
          deliveryRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0;

          if (stats.cost > 0) {
            finalCost = stats.cost;
          } else {
            finalCost = stats.delivered * price;
          }
        }

        const isRejected = t.status === 'REJECTED';
        if (!stats) {
          console.log(`[WhatsApp Billing] Template "${name}" (Status: ${t.status}) has no analytics data. Reason: ${isRejected ? 'Template is REJECTED (analytics excluded).' :
            (!templateMetricsAvailable && !hasMetaStats) ? 'Template analytics not available from Meta API or Firebase.' :
              'No matching data points returned from Meta API or Firebase for the selected date range.'
            }`);
        }

        const showStats = !isRejected && (stats !== undefined || templateMetricsAvailable);

        return {
          templateName: name,
          category: cat,
          status: t.status || 'APPROVED',
          language: t.language || 'en',
          qualityScore: t.quality_score?.score || 'GREEN',
          sent: showStats ? (stats ? stats.sent : 0) : null,
          delivered: showStats ? (stats ? stats.delivered : 0) : null,
          read: showStats ? (stats ? stats.read : 0) : null,
          failed: showStats ? (stats ? stats.failed : 0) : null,
          readRate: showStats ? (stats ? readRate : 0) : null,
          deliveryRate: showStats ? (stats ? deliveryRate : 0) : null,
          cost: showStats ? (stats ? (Math.round(finalCost * 100) / 100) : 0) : null,
        };
      });

      merged.sort((a: any, b: any) => {
        if (a.delivered === null) return 1;
        if (b.delivered === null) return -1;
        return b.delivered - a.delivered;
      });

      console.log('[WhatsApp Templates Live Final Response]:', JSON.stringify(merged).substring(0, 1000));
      return res.json(merged);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * GET /api/admin/apps/:id/whatsapp/template/:templateName
   */
  async getTemplateDetail(req: Request, res: Response) {
    const { id, templateName } = req.params;
    try {
      const days = Number(req.query['days']) || 30;
      const bypassCache = req.query['refresh'] === 'true';

      const config = await getWhatsAppConfigDecrypted(id);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      // Check permissions gracefully instead of throwing hard error
      let checkPerms = { granted: [] as string[], missing: [] as string[] };
      try {
        checkPerms = await whatsappCloudService.checkPermissions(config.token);
      } catch (permErr: any) {
        console.warn('[WhatsApp Controller] Failed to check permissions:', permErr.message);
      }

      const phone = config.phoneId;
      const metaTemplates = await whatsappCloudService.getMessageTemplates(config.wabaId, config.token, bypassCache);
      const templateInfo = metaTemplates.find((t: any) => t.name === templateName);

      if (!templateInfo) {
        return res.status(404).json({ error: `Template ${templateName} not found on Meta account.` });
      }

      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - days * 24 * 3600;

      let templateMetricsAvailable = true;
      let metaAnalytics: any[] = [];
      try {
        metaAnalytics = await whatsappCloudService.getTemplateAnalytics(
          config.wabaId,
          config.token,
          startEpoch,
          endEpoch,
          'DAILY',
          bypassCache
        );
      } catch (err: any) {
        templateMetricsAvailable = false;
        console.warn('[WhatsApp Billing] Template performance metrics not available:', err.message);
      }

      const targetAnalytics = templateMetricsAvailable
        ? metaAnalytics.find((t: any) => {
            const tId = t.template_id || 
              (t.template_ids && t.template_ids[0]) || 
              (t.data_points && t.data_points[0] && t.data_points[0].template_id);
            return (tId && String(tId) === String(templateInfo.id)) || (t.name && t.name === templateName);
          })
        : null;

      let sent = 0, delivered = 0, read = 0, failed = 0, costVal = 0;
      const dateMap: Record<string, { sent: number; delivered: number; read: number; cost: number }> = {};

      if (templateMetricsAvailable && targetAnalytics && targetAnalytics.data_points) {
        for (const dp of targetAnalytics.data_points) {
          sent += Number(dp.sent || 0);
          delivered += Number(dp.delivered || 0);
          read += Number(dp.read || 0);
          failed += Number(dp.failed || 0);

          let dpCost = 0;
          if (dp.cost) {
            const spentObj = dp.cost.find((c: any) => c.type === 'amount_spent');
            if (spentObj && spentObj.value !== undefined) {
              dpCost = Number(spentObj.value);
            }
          }
          costVal += dpCost;

          const key = parseMetaDateString(dp.start || dp.end);
          if (!dateMap[key]) {
            dateMap[key] = { sent: 0, delivered: 0, read: 0, cost: 0 };
          }
          dateMap[key].sent += Number(dp.sent || 0);
          dateMap[key].delivered += Number(dp.delivered || 0);
          dateMap[key].read += Number(dp.read || 0);
          dateMap[key].cost += dpCost;
        }
      }

      const hasDetailData = templateMetricsAvailable && targetAnalytics && sent > 0;
      if (!hasDetailData && firestore) {
        console.log(`[WhatsApp Billing Detail] Meta returned no analytics for ${templateName}. Fetching from Firebase fallback...`);
        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          const snapshot = await firestore.collection('whatsapp_message_logs')
            .where('appId', '==', id)
            .where('templateName', '==', templateName)
            .where('timestamp', '>=', startDate)
            .get();

          sent = 0;
          delivered = 0;
          read = 0;
          failed = 0;
          costVal = 0;
          templateMetricsAvailable = true;

          for (const doc of snapshot.docs) {
            const data = doc.data();
            const status = data.status || 'sent';
            const docDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
            const key = docDate.toISOString().split('T')[0];
            const docCost = Number(data.cost || 0);

            if (!dateMap[key]) {
              dateMap[key] = { sent: 0, delivered: 0, read: 0, cost: 0 };
            }

            costVal += docCost;
            dateMap[key].cost += docCost;

            if (status === 'read') {
              sent++; delivered++; read++;
              dateMap[key].sent++; dateMap[key].delivered++; dateMap[key].read++;
            } else if (status === 'delivered') {
              sent++; delivered++;
              dateMap[key].sent++; dateMap[key].delivered++;
            } else if (status === 'sent') {
              sent++;
              dateMap[key].sent++;
            } else if (status === 'failed') {
              failed++;
            }
          }
        } catch (fbErr: any) {
          console.error('[WhatsApp Billing Detail Fallback] Firebase aggregation failed:', fbErr.message);
        }
      }

      const cat = (templateInfo.category || 'utility').toLowerCase();
      const price = calculateConversationPrice(cat, phone).price;

      // Extract components text
      let bodyText = '', headerText = '', footerText = '';
      if (templateInfo.components) {
        const bodyComp = templateInfo.components.find((c: any) => c.type === 'BODY');
        if (bodyComp) bodyText = bodyComp.text || '';
        const headerComp = templateInfo.components.find((c: any) => c.type === 'HEADER');
        if (headerComp) headerText = headerComp.text || '';
        const footerComp = templateInfo.components.find((c: any) => c.type === 'FOOTER');
        if (footerComp) footerText = footerComp.text || '';
      }

      const graphLabels: string[] = [];
      const graphSent: (number | null)[] = [];
      const graphDelivered: (number | null)[] = [];
      const graphRead: (number | null)[] = [];
      const graphCost: (number | null)[] = [];

      const now = Date.now();
      const stepMs = 24 * 3600 * 1000;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * stepMs);
        const dStr = d.toISOString().split('T')[0];
        graphLabels.push(`${d.getDate()} ${monthNames[d.getMonth()]}`);

        const dayData = dateMap[dStr];
        if (templateMetricsAvailable) {
          const sVal = dayData ? dayData.sent : 0;
          const dVal = dayData ? dayData.delivered : 0;
          const rVal = dayData ? dayData.read : 0;
          let cVal = dayData ? dayData.cost : 0;
          if (cVal === 0 && dVal > 0) {
            cVal = dVal * price;
          }
          graphSent.push(sVal);
          graphDelivered.push(dVal);
          graphRead.push(rVal);
          graphCost.push(Math.round(cVal * 100) / 100);
        } else {
          graphSent.push(null);
          graphDelivered.push(null);
          graphRead.push(null);
          graphCost.push(null);
        }
      }

      const finalCostVal = costVal > 0 ? costVal : delivered * price;

      const responseDetail = {
        templateName,
        category: cat,
        status: templateInfo.status || 'APPROVED',
        language: templateInfo.language || 'en',
        qualityScore: templateInfo.quality_score?.score || 'GREEN',
        bodyText,
        headerText,
        footerText,
        metrics: {
          sent: templateMetricsAvailable ? sent : null,
          delivered: templateMetricsAvailable ? delivered : null,
          read: templateMetricsAvailable ? read : null,
          failed: templateMetricsAvailable ? failed : null,
          total: templateMetricsAvailable ? sent : null,
          readRate: templateMetricsAvailable && delivered > 0 ? Math.round((read / delivered) * 100) : null,
          deliveryRate: templateMetricsAvailable && sent > 0 ? Math.round((delivered / sent) * 100) : null,
          cost: templateMetricsAvailable ? (Math.round(finalCostVal * 100) / 100) : null,
          costPerMessage: price,
        },
        graph: {
          labels: graphLabels,
          sent: graphSent,
          delivered: graphDelivered,
          read: graphRead,
          cost: graphCost,
          lastUpdated: new Date().toISOString(),
          dataSource: 'meta_api',
        },
        period: `${days}d`,
        lastUpdated: new Date().toISOString(),
      };

      console.log('[WhatsApp Template Detail Final Response]:', JSON.stringify(responseDetail).substring(0, 1000));
      return res.json(responseDetail);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  },

  /**
   * GET /api/admin/apps/:id/whatsapp/realtime-graph
   */
  async getRealtimeGraph(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const days = Number(req.query['days']) || 30;
      const bypassCache = req.query['refresh'] === 'true';

      const config = await getWhatsAppConfigDecrypted(id);
      if (!config) {
        throw new Error('PERMISSION_ERROR: WhatsApp integration is disabled or credentials are not configured.');
      }

      // Check permissions gracefully instead of throwing hard error
      let checkPerms = { granted: [] as string[], missing: [] as string[] };
      try {
        checkPerms = await whatsappCloudService.checkPermissions(config.token);
      } catch (permErr: any) {
        console.warn('[WhatsApp Controller] Failed to check permissions:', permErr.message);
      }

      // Fetch basic metadata to resolve country rates
      let phoneDetails: any = {};
      try {
        phoneDetails = await whatsappCloudService.getPhoneNumberDetails(config.phoneId, config.token, bypassCache);
      } catch (err: any) {
        console.warn('[WhatsApp Controller] getPhoneNumberDetails failed:', err.message);
      }

      const endEpoch = Math.floor(Date.now() / 1000);
      const startEpoch = endEpoch - days * 24 * 3600;

      let templateMetricsAvailable = true;
      let templateAnalytics: any[] = [];
      try {
        templateAnalytics = await whatsappCloudService.getTemplateAnalytics(
          config.wabaId,
          config.token,
          startEpoch,
          endEpoch,
          'DAILY',
          bypassCache
        );
      } catch (err: any) {
        templateMetricsAvailable = false;
        console.warn('[WhatsApp Billing] Template performance metrics not available:', err.message);
      }

      let pricingMetricsAvailable = true;
      let pricingAnalytics: any[] = [];
      try {
        pricingAnalytics = await whatsappCloudService.getPricingAnalytics(
          config.wabaId,
          config.token,
          startEpoch,
          endEpoch,
          'DAILY',
          bypassCache
        );
      } catch (err: any) {
        pricingMetricsAvailable = false;
        console.warn('[WhatsApp Billing] Pricing analytics not available:', err.message);
      }

      const dateMap: Record<string, { sent: number; delivered: number; read: number; cost: number }> = {};

      if (templateMetricsAvailable) {
        for (const item of templateAnalytics) {
          if (!item.data_points) continue;
          for (const dp of item.data_points) {
            const dateStr = parseMetaDateString(dp.start || dp.end);
            if (!dateStr) continue;
            if (!dateMap[dateStr]) {
              dateMap[dateStr] = { sent: 0, delivered: 0, read: 0, cost: 0 };
            }
            dateMap[dateStr].sent += Number(dp.sent || 0);
            dateMap[dateStr].delivered += Number(dp.delivered || 0);
            dateMap[dateStr].read += Number(dp.read || 0);
          }
        }
      }

      const phoneNum = phoneDetails?.display_phone_number || '';
      const country = getCountryCode(phoneNum);
      const rates = METADATA_PRICING_TABLE[country] || METADATA_PRICING_TABLE['IN'];

      if (pricingMetricsAvailable) {
        for (const item of pricingAnalytics) {
          let d: Date | null = null;
          if (item.start !== undefined && item.start !== null) {
            const num = Number(item.start);
            if (!isNaN(num)) {
              const isSeconds = num < 99999999999;
              d = new Date(isSeconds ? num * 1000 : num);
            } else {
              d = new Date(item.start);
            }
          }

          if (!d || isNaN(d.getTime())) {
            if (item?.start !== undefined) {
              console.warn('[WhatsApp Billing] Skipping invalid pricing analytics start date:', item?.start);
            }
            continue;
          }

          const dateStr = d.toISOString().split('T')[0];
          if (!dateMap[dateStr]) {
            dateMap[dateStr] = { sent: 0, delivered: 0, read: 0, cost: 0 };
          }
          if (item.values) {
            for (const val of item.values) {
              if (val.dimension === 'PRICING_CATEGORY') {
                const cat = val.value?.toLowerCase();
                const costMetric = val.metric_types?.find((m: any) => m.type === 'COST');
                const volMetric = val.metric_types?.find((m: any) => m.type === 'VOLUME');
                const costVal = Number(costMetric?.value || 0);
                const volVal = Number(volMetric?.value || 0);

                if (costVal > 0) {
                  dateMap[dateStr].cost += costVal;
                } else if (volVal > 0) {
                  const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;
                  dateMap[dateStr].cost += volVal * rate;
                }
              }
            }
          }
        }
      }

      // Fallback 1: Use template analytics volumes per day
      let hasGraphCost = Object.values(dateMap).some(d => d.cost > 0);
      if (!hasGraphCost && templateMetricsAvailable && templateAnalytics.length > 0) {
        let metaTemplates: any[] = [];
        try {
          metaTemplates = await whatsappCloudService.getMessageTemplates(config.wabaId, config.token, bypassCache);
        } catch (err) {
          console.warn('Failed to fetch message templates for graph fallback:', err);
        }
        const templateCategoryMap: Record<string, string> = {};
        for (const t of metaTemplates) {
          if (t.id) templateCategoryMap[t.id] = t.category;
          if (t.name) templateCategoryMap[t.name] = t.category;
        }

        for (const item of templateAnalytics) {
          const cat = (templateCategoryMap[item.template_id] || templateCategoryMap[item.name] || 'utility').toLowerCase();
          const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;
          if (item.data_points) {
            for (const dp of item.data_points) {
              const dateStr = parseMetaDateString(dp.start || dp.end);
              if (!dateStr) continue;
              if (!dateMap[dateStr]) {
                dateMap[dateStr] = { sent: 0, delivered: 0, read: 0, cost: 0 };
              }
              const delivered = Number(dp.delivered || 0);
              dateMap[dateStr].cost += delivered * rate;
            }
          }
        }
      }

      // Fallback 2: Calculate daily cost from PostgreSQL notification_logs
      hasGraphCost = Object.values(dateMap).some(d => d.cost > 0);
      if (!hasGraphCost) {
        try {
          const dbLogs = await query(
            `SELECT DATE(created_at) as date, event_type as template, status, COUNT(*) as count
             FROM notification_logs
             WHERE channel = 'whatsapp'
               AND app_id = $1
               AND created_at >= NOW() - CAST($2 || ' days' AS INTERVAL)
             GROUP BY DATE(created_at), event_type, status`,
            [id, days]
          );

          for (const row of dbLogs.rows) {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            const name = row.template || '';
            const status = row.status;
            const count = parseInt(row.count || '0', 10);
            if (status === 'failed') continue;

            const cat = (name === 'task_status_update' || name === 'order_confirmation_admin' || name === 'welcome_message' || name === 'get_offers') ? 'marketing' : 'utility';
            const rate = rates[cat]?.price || rates['utility']?.price || 0.11255;

            if (!dateMap[dateStr]) {
              dateMap[dateStr] = { sent: 0, delivered: 0, read: 0, cost: 0 };
            }
            dateMap[dateStr].cost += count * rate;
            dateMap[dateStr].delivered += count;
          }
        } catch (dbErr) {
          console.error('Failed to calculate graph fallback cost from notification_logs:', dbErr);
        }
      }

      const graphLabels: string[] = [];
      const graphSent: (number | null)[] = [];
      const graphDelivered: (number | null)[] = [];
      const graphRead: (number | null)[] = [];
      const graphCost: (number | null)[] = [];

      const now = Date.now();
      const stepMs = 24 * 3600 * 1000;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * stepMs);
        const dStr = d.toISOString().split('T')[0];
        graphLabels.push(`${d.getDate()} ${monthNames[d.getMonth()]}`);

        const dayData = dateMap[dStr];
        graphSent.push(templateMetricsAvailable ? (dayData ? dayData.sent : 0) : null);
        graphDelivered.push(templateMetricsAvailable ? (dayData ? dayData.delivered : 0) : null);
        graphRead.push(templateMetricsAvailable ? (dayData ? dayData.read : 0) : null);
        graphCost.push(dayData ? Math.round(dayData.cost * 100) / 100 : 0);
      }

      const responseGraph = {
        labels: graphLabels,
        sent: graphSent,
        delivered: graphDelivered,
        read: graphRead,
        cost: graphCost,
        lastUpdated: new Date().toISOString(),
        dataSource: 'meta_api',
      };

      console.log('[WhatsApp Realtime Graph Final Response]:', JSON.stringify(responseGraph).substring(0, 1000));
      return res.json(responseGraph);
    } catch (err: any) {
      return handleControllerError(err, res);
    }
  }
};
