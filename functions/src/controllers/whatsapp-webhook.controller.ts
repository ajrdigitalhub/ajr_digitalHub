import { Request, Response } from 'express';
import { whatsappConfig } from '../config/whatsapp.config';
import { hubProcessor, StructuredMessage } from '../services/hubProcessor';
import { query } from '../db';
import { decryptValue } from '../utils/crypto';
import { firestore } from '../config/firebase';

export const whatsappWebhookController = {
  /**
   * GET /webhook - Handshake validation with Meta APIs
   */
  async handleHandshake(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'];
    const appId = req.query['appId'] as string;

    if (mode && token) {
      if (mode === 'subscribe') {
        let isValid = false;

        if (appId) {
          const resConfig = await query(`SELECT webhook_verify_token FROM whatsapp_config WHERE app_id = $1`, [appId]);
          if (resConfig.rows.length > 0) {
            const decVerify = decryptValue(resConfig.rows[0].webhook_verify_token || '');
            if (token === decVerify) {
              isValid = true;
            }
          }
        } else {
          // Check all database configs
          const resConfigs = await query(`SELECT webhook_verify_token FROM whatsapp_config WHERE enabled = true`);
          for (const row of resConfigs.rows) {
            const decVerify = decryptValue(row.webhook_verify_token || '');
            if (token === decVerify) {
              isValid = true;
              break;
            }
          }
        }

        // Fallback to global config
        if (!isValid && token === whatsappConfig.verifyToken) {
          isValid = true;
        }

        if (isValid) {
          console.log('Webhook handshake verified successfully.');
          return res.status(200).send(challenge);
        } else {
          console.warn('Webhook verification failed: Verify token mismatch.');
          return res.sendStatus(403);
        }
      }
    }
    return res.sendStatus(400);
  },

  /**
   * POST /webhook - Receiver for real-time payload updates
   */
  async handleEvent(req: Request, res: Response) {
    const body = req.body;

    // Acknowledge receipt to Meta immediately (prevents retry loop)
    res.status(200).json({ status: 'received' });

    try {
      if (body.object === 'whatsapp_business_account' && body.entry) {
        for (const entry of body.entry) {
          if (!entry.changes) continue;

          for (const change of entry.changes) {
            const value = change.value;
            if (!value) continue;

            // 1. Process Webhook Status Updates
            if (value.statuses && Array.isArray(value.statuses)) {
              const wabaId = entry.id;
              let resolvedAppId = null;
              try {
                const configRes = await query(`SELECT app_id FROM whatsapp_config WHERE waba_id = $1`, [wabaId]);
                if (configRes.rows.length > 0) {
                  resolvedAppId = configRes.rows[0].app_id;
                }
              } catch (dbErr: any) {
                console.error('[Webhook DB error]:', dbErr.message);
              }

              for (const status of value.statuses) {
                const messageId = status.id;
                const newStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
                const timestamp = new Date(parseInt(status.timestamp, 10) * 1000);
                const conversationId = status.conversation?.id || null;
                const pricingCategory = status.pricing?.category || status.conversation?.origin?.type || null;

                console.log(`[WhatsApp Webhook Status] msgId: ${messageId} | status: ${newStatus} | waba: ${wabaId} | app: ${resolvedAppId}`);

                // Update Firestore logs
                if (firestore) {
                  try {
                    const docRef = firestore.collection('whatsapp_message_logs').doc(messageId);
                    const doc = await docRef.get();
                    if (doc.exists) {
                      const data = doc.data();
                      const updateData: any = {
                        status: newStatus,
                        timestamp,
                        updatedAt: new Date()
                      };
                      if (conversationId) updateData.conversationId = conversationId;
                      if (pricingCategory) {
                        updateData.category = pricingCategory.toLowerCase();
                        const rates: Record<string, number> = { utility: 0.11255, marketing: 0.86, authentication: 0.09, service: 0.05 };
                        updateData.cost = rates[updateData.category] || data.cost || 0.11255;
                      }
                      await docRef.update(updateData);

                      // Log to the live logs stream for frontend
                      await firestore.collection('whatsapp_logs').add({
                        appId: data.appId || resolvedAppId,
                        messageId,
                        recipient: data.recipient || status.recipient_id,
                        status: newStatus,
                        timestamp,
                        templateName: data.templateName || 'unknown',
                        category: pricingCategory || data.category || 'utility',
                        cost: updateData.cost || data.cost || 0.11255
                      });
                    } else {
                      // If message sent was not logged originally, create a fallback entry
                      const cat = pricingCategory?.toLowerCase() || 'utility';
                      const rates: Record<string, number> = { utility: 0.11255, marketing: 0.86, authentication: 0.09, service: 0.05 };
                      const price = rates[cat] || 0.11255;

                      await docRef.set({
                        messageId,
                        appId: resolvedAppId,
                        templateName: 'unknown',
                        recipient: status.recipient_id || 'unknown',
                        status: newStatus,
                        timestamp,
                        category: cat,
                        cost: price,
                        conversationId
                      });

                      await firestore.collection('whatsapp_logs').add({
                        appId: resolvedAppId,
                        messageId,
                        recipient: status.recipient_id || 'unknown',
                        status: newStatus,
                        timestamp,
                        templateName: 'unknown',
                        category: cat,
                        cost: price
                      });
                    }
                  } catch (fsErr: any) {
                    console.error('[Webhook Firestore Error]:', fsErr.message);
                  }
                }
              }
            }

            // 2. Process Messages (Incoming messages)
            if (value.messages && Array.isArray(value.messages)) {
              for (const msg of value.messages) {
                const contact = value.contacts?.[0] || {};
                
                const structuredMessage: StructuredMessage = {
                  messageId: msg.id,
                  senderPhone: msg.from,
                  senderName: contact.profile?.name || 'Unknown Guest',
                  timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
                  textBody: msg.text?.body || '',
                  type: msg.type
                };

                if (structuredMessage.type === 'text' && structuredMessage.textBody) {
                  // Execute processIncoming asynchronously to keep request lifecycle fast
                  hubProcessor.processIncoming(structuredMessage).catch(err => {
                    console.error(`[HubProcessor Error] Failed processing message ${structuredMessage.messageId}:`, err.message);
                  });
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error parsing incoming Meta payload:', err.message);
    }
  }
};
