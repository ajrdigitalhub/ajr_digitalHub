import axios, { AxiosRequestConfig } from 'axios';

// ────────────────────────────────────────────────────────────────────────────
//  Simple In-Memory Cache
// ────────────────────────────────────────────────────────────────────────────
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearWhatsAppCache(): void {
  cache.clear();
}

// ────────────────────────────────────────────────────────────────────────────
//  WhatsApp Cloud Service
// ────────────────────────────────────────────────────────────────────────────
export const whatsappCloudService = {
  /**
   * Helper to execute Meta Graph API requests with Retry & Exponential Backoff
   */
  async request(
    config: AxiosRequestConfig,
    retries = 3,
    delayMs = 1000
  ): Promise<any> {
    const url = config.url || '';
    const method = config.method || 'GET';
    console.log(`[WhatsApp API Request] Method: ${method}, URL: ${url}, Params: ${JSON.stringify(config.params)}`);

    try {
      const res = await axios({
        ...config,
        timeout: config.timeout || 12000,
      });
      console.log(`[WhatsApp API Response] URL: ${url}, Status: ${res.status}, Payload: ${JSON.stringify(res.data).substring(0, 1000)}`);
      return res.data;
    } catch (err: any) {
      const status = err.response?.status;
      const metaError = err.response?.data?.error;
      const errorMsg = metaError?.message || err.message;
      const errorCode = metaError?.code;

      console.error(`[WhatsApp API Response Error] URL: ${url}, Status: ${status}, Message: ${errorMsg} (Code: ${errorCode || 'none'})`);

      // Token Expired / Invalid Token detection
      if (errorCode === 190 || status === 401) {
        throw new Error(`AUTHENTICATION_ERROR: Invalid or expired Meta System Access Token. Details: ${errorMsg}`);
      }

      // Permission Error detection
      if (errorCode === 10 || errorCode === 200 || errorCode === 100 || errorCode === 200005) {
        throw new Error(`PERMISSION_ERROR: Insufficient permissions or incorrect resource IDs. Details: ${errorMsg}`);
      }

      // Retry on Rate Limit (429) or temporary server errors (5xx)
      if ((status === 429 || (status >= 500 && status < 600)) && retries > 0) {
        console.warn(`[WhatsApp API 429/5xx] Retrying request. Waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.request(config, retries - 1, delayMs * 2);
      }

      throw new Error(`META_API_ERROR: ${errorMsg} (Code: ${errorCode || status || 'unknown'})`);
    }
  },

  /**
   * Verify Access Token permissions
   */
  async checkPermissions(token: string): Promise<{ granted: string[]; missing: string[] }> {
    try {
      const data = await this.request({
        url: 'https://graph.facebook.com/v20.0/me/permissions',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const permissions = data?.data || [];
      const granted = permissions.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);

      const required = ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'];
      const missing = required.filter(p => !granted.includes(p));
      return { granted, missing };
    } catch (err: any) {
      console.error('[WhatsApp Cloud Service] Failed to check permissions:', err.message);
      throw err;
    }
  },

  /**
   * Fetch WABA Meta Details
   */
  async getWabaDetails(wabaId: string, token: string, bypassCache = false): Promise<any> {
    const cacheKey = `waba_${wabaId}`;
    if (!bypassCache) {
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.request({
      url: `https://graph.facebook.com/v20.0/${wabaId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      params: { fields: 'name,id,timezone_id,currency,country,status,business_verification_status' }
    });

    setCache(cacheKey, data);
    return data;
  },

  /**
   * Fetch Phone Number Details
   */
  async getPhoneNumberDetails(phoneId: string, token: string, bypassCache = false): Promise<any> {
    const cacheKey = `phone_${phoneId}`;
    if (!bypassCache) {
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.request({
      url: `https://graph.facebook.com/v20.0/${phoneId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      params: { fields: 'display_phone_number,verified_name,code_verification_status,quality_rating,whatsapp_business_manager_messaging_limit' }
    });

    setCache(cacheKey, data);
    return data;
  },

  /**
   * Fetch WABA message templates
   */
  async getMessageTemplates(wabaId: string, token: string, bypassCache = false): Promise<any[]> {
    const cacheKey = `templates_${wabaId}`;
    if (!bypassCache) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.request({
      url: `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      params: { fields: 'id,name,status,category,language,quality_score,rejected_reason,components', limit: 1000 }
    });

    const templates = data?.data || [];
    setCache(cacheKey, templates);
    return templates;
  },

  async getPricingAnalytics(
    wabaId: string,
    token: string,
    startEpoch: number,
    endEpoch: number,
    granularity: 'HALF_HOUR' | 'DAILY' | 'MONTHLY' = 'DAILY',
    bypassCache = false
  ): Promise<any[]> {
    const cacheKey = `pricing_${wabaId}_${startEpoch}_${endEpoch}_${granularity}`;
    if (!bypassCache) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.request({
      url: `https://graph.facebook.com/v20.0/${wabaId}/pricing_analytics`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      params: {
        start: startEpoch,
        end: endEpoch,
        granularity: granularity,
        dimensions: '["PRICING_CATEGORY","PRICING_TYPE"]'
      }
    });
    console.log("PRICING_ANALYTICS***************", JSON.stringify(data.data))
    const analytics = data?.data || [];
    setCache(cacheKey, analytics);
    return analytics;
  },

  /**
   * Fetch Template Analytics (Trend data)
   */
  async getTemplateAnalytics(
    wabaId: string,
    token: string,
    startEpoch: number,
    endEpoch: number,
    granularity: 'HALF_HOUR' | 'DAILY' | 'MONTHLY' = 'DAILY',
    bypassCache = false
  ): Promise<any[]> {
    const cacheKey = `template_analytics_${wabaId}_${startEpoch}_${endEpoch}_${granularity}`;
    if (!bypassCache) {
      const cached = getCached<any[]>(cacheKey);
      if (cached !== null) return cached;
    }

    try {
      // 1. Fetch templates to get their IDs
      const templates = await this.getMessageTemplates(wabaId, token, bypassCache);
      const templateIds = templates
        .filter((t: any) => t.status === 'APPROVED' || t.status === 'ACTIVE')
        .map((t: any) => t.id)
        .filter(Boolean);

      if (templateIds.length === 0) {
        setCache(cacheKey, []);
        return [];
      }

      let analytics: any[] = [];
      try {
        // Try batch query first with correct comma-separated list of IDs
        const data = await this.request({
          url: `https://graph.facebook.com/v20.0/${wabaId}/template_analytics`,
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          params: {
            start: startEpoch,
            end: endEpoch,
            granularity: granularity,
            template_ids: templateIds.join(',')
          }
        });
        analytics = data?.data || [];
      } catch (batchErr: any) {
        console.warn(`[WhatsApp API Warning] Batch template_analytics query failed: ${batchErr.message}. Retrying template-by-template.`);

        // Fallback: Query Meta's template_analytics edge concurrently template-by-template with single ID string
        const analyticsList = await Promise.all(
          templateIds.map(async (id) => {
            try {
              const res = await this.request({
                url: `https://graph.facebook.com/v20.0/${wabaId}/template_analytics`,
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                params: {
                  start: startEpoch,
                  end: endEpoch,
                  granularity: granularity,
                  template_ids: id
                }
              });
              return res?.data || [];
            } catch (err: any) {
              console.warn(`[WhatsApp API Warning] Failed fetching template_analytics for template ID ${id}: ${err.message}`);
              return [];
            }
          })
        );
        analytics = analyticsList.flat().filter(Boolean);
      }

      setCache(cacheKey, analytics);
      return analytics;
    } catch (err: any) {
      console.error(`[WhatsApp API Error] Failed fetching template_analytics for WABA ${wabaId}:`, err.message);
      // Fail gracefully: return empty array so billing panels continue to render other data
      return [];
    }
  },

  /**
   * Send Template Message
   */
  async sendTemplateMessage(
    phoneId: string,
    token: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: any[]
  ): Promise<any> {
    return this.request({
      url: `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components
        }
      }
    });
  }
};
