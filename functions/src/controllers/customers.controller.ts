import { Request, Response } from 'express';
import { query, pool } from '../db';

export const customersController = {
  async getCustomers(req: Request, res: Response) {
    try {
      if (!pool) {
        return res.json([]);
      }
      
      let q = 'SELECT * FROM customers';
      const params: any[] = [];
      
      if (req.user?.role !== 'admin') {
        const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
        const customerId = userRes.rows[0]?.customer_id;
        if (!customerId) {
          return res.json([]);
        }
        q += ' WHERE id = $1';
        params.push(customerId);
      }
      
      const result = await query(q, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (req.user?.role !== 'admin') {
        const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
        if (userRes.rows[0]?.customer_id !== id) {
          return res.status(403).json({ error: 'Access denied to this customer profile' });
        }
      }

      const custRes = await query('SELECT * FROM customers WHERE id = $1', [id]);
      if (custRes.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

      const contacts = await query('SELECT * FROM customer_contacts WHERE customer_id = $1', [id]);
      const billing = await query('SELECT * FROM billing_contacts WHERE customer_id = $1', [id]);
      const subscription = await query('SELECT * FROM subscriptions WHERE customer_id = $1', [id]);
      const integrations = await query('SELECT * FROM customer_integrations WHERE customer_id = $1', [id]);
      const settings = await query('SELECT * FROM customer_settings WHERE customer_id = $1', [id]);

      res.json({
        ...custRes.rows[0],
        contacts: contacts.rows,
        billing: billing.rows[0] || null,
        subscription: subscription.rows[0] || null,
        integrations: integrations.rows[0] || null,
        settings: settings.rows[0] || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createCustomer(req: Request, res: Response) {
    if (!pool) return res.status(500).json({ error: 'Database unavailable' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        name, business_type, gst_number, pan, website, industry, address, country, currency, timezone, logo,
        primary_contact, billing_contact, subscription
      } = req.body;

      // 1. Insert customer
      const custRes = await client.query(
        `INSERT INTO customers (name, business_type, gst_number, pan, website, industry, address, country, currency, timezone, logo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [name, business_type, gst_number, pan, website, industry, address, country, currency || 'INR', timezone || 'Asia/Kolkata', logo]
      );
      const customer = custRes.rows[0];

      // If user is logged in, link user to this customer
      if (req.user?.id) {
        await client.query('UPDATE users SET customer_id = $1 WHERE id = $2', [customer.id, req.user.id]);
      }

      // 2. Insert primary contact
      if (primary_contact) {
        await client.query(
          `INSERT INTO customer_contacts (customer_id, name, mobile, whatsapp, alternate_mobile, email, designation, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [customer.id, primary_contact.name, primary_contact.mobile, primary_contact.whatsapp, primary_contact.alternate_mobile, primary_contact.email, primary_contact.designation]
        );
      }

      // 3. Insert billing contact
      if (billing_contact) {
        await client.query(
          `INSERT INTO billing_contacts (customer_id, billing_name, billing_email, billing_mobile, gst_details, address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [customer.id, billing_contact.billing_name, billing_contact.billing_email, billing_contact.billing_mobile, billing_contact.gst_details, billing_contact.address]
        );
      }

      // 4. Insert subscription details
      const subPlan = subscription?.plan || 'Lite';
      const billingCycle = subscription?.billing_cycle || 'monthly';
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      await client.query(
        `INSERT INTO subscriptions (customer_id, plan, billing_cycle, renewal_date, status, payment_method)
         VALUES ($1, $2, $3, $4, 'active', $5)`,
        [customer.id, subPlan, billingCycle, renewalDate.toISOString().split('T')[0], subscription?.payment_method || 'UPI']
      );

      // 5. Default integrations & settings
      await client.query(`INSERT INTO customer_integrations (customer_id) VALUES ($1)`, [customer.id]);
      await client.query(`INSERT INTO customer_settings (customer_id) VALUES ($1)`, [customer.id]);

      // 6. Log activity
      await client.query(
        `INSERT INTO customer_activity (customer_id, action, user_id, details) VALUES ($1, $2, $3, $4)`,
        [customer.id, 'customer_created', req.user?.id || null, JSON.stringify({ name })]
      );

      await client.query('COMMIT');
      res.status(201).json(customer);
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },

  async updateCustomer(req: Request, res: Response) {
    if (!pool) return res.status(500).json({ error: 'Database unavailable' });
    const { id } = req.params;

    if (req.user?.role !== 'admin') {
      const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
      if (userRes.rows[0]?.customer_id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        name, business_type, gst_number, pan, website, industry, address, country, currency, timezone, logo, status,
        primary_contact, billing_contact, subscription, integrations
      } = req.body;

      // 1. Update company info
      await client.query(
        `UPDATE customers SET 
          name = COALESCE($1, name),
          business_type = COALESCE($2, business_type),
          gst_number = COALESCE($3, gst_number),
          pan = COALESCE($4, pan),
          website = COALESCE($5, website),
          industry = COALESCE($6, industry),
          address = COALESCE($7, address),
          country = COALESCE($8, country),
          currency = COALESCE($9, currency),
          timezone = COALESCE($10, timezone),
          logo = COALESCE($11, logo),
          status = COALESCE($12, status),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $13`,
        [name, business_type, gst_number, pan, website, industry, address, country, currency, timezone, logo, status, id]
      );

      // 2. Update primary contact
      if (primary_contact) {
        await client.query(
          `INSERT INTO customer_contacts (customer_id, name, mobile, whatsapp, alternate_mobile, email, designation, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           ON CONFLICT DO NOTHING`, // simplified logic, normally you'd check/update
          [id, primary_contact.name, primary_contact.mobile, primary_contact.whatsapp, primary_contact.alternate_mobile, primary_contact.email, primary_contact.designation]
        );
        // Let's do an update instead if we have primary contacts
        await client.query(
          `UPDATE customer_contacts SET 
            name = $1, mobile = $2, whatsapp = $3, alternate_mobile = $4, email = $5, designation = $6
           WHERE customer_id = $7 AND is_primary = true`,
          [primary_contact.name, primary_contact.mobile, primary_contact.whatsapp, primary_contact.alternate_mobile, primary_contact.email, primary_contact.designation, id]
        );
      }

      // 3. Update billing details
      if (billing_contact) {
        const checkBilling = await client.query('SELECT id FROM billing_contacts WHERE customer_id = $1', [id]);
        if (checkBilling.rows.length === 0) {
          await client.query(
            `INSERT INTO billing_contacts (customer_id, billing_name, billing_email, billing_mobile, gst_details, address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, billing_contact.billing_name, billing_contact.billing_email, billing_contact.billing_mobile, billing_contact.gst_details, billing_contact.address]
          );
        } else {
          await client.query(
            `UPDATE billing_contacts SET 
              billing_name = COALESCE($1, billing_name),
              billing_email = COALESCE($2, billing_email),
              billing_mobile = COALESCE($3, billing_mobile),
              gst_details = COALESCE($4, gst_details),
              address = COALESCE($5, address)
             WHERE customer_id = $6`,
            [billing_contact.billing_name, billing_contact.billing_email, billing_contact.billing_mobile, billing_contact.gst_details, billing_contact.address, id]
          );
        }
      }

      // 4. Update subscription plan
      if (subscription) {
        await client.query(
          `UPDATE subscriptions SET 
            plan = COALESCE($1, plan),
            billing_cycle = COALESCE($2, billing_cycle),
            renewal_date = COALESCE($3, renewal_date)::date,
            status = COALESCE($4, status),
            payment_method = COALESCE($5, payment_method),
            updated_at = CURRENT_TIMESTAMP
           WHERE customer_id = $6`,
          [subscription.plan, subscription.billing_cycle, subscription.renewal_date, subscription.status, subscription.payment_method, id]
        );
      }

      // 5. Update integrations
      if (integrations) {
        await client.query(
          `UPDATE customer_integrations SET 
            whatsapp_cloud_api = COALESCE($1, whatsapp_cloud_api),
            meta_business = COALESCE($2, meta_business),
            google_ads = COALESCE($3, google_ads),
            firebase = COALESCE($4, firebase),
            smtp = COALESCE($5, smtp),
            payment_gateway = COALESCE($6, payment_gateway),
            updated_at = CURRENT_TIMESTAMP
           WHERE customer_id = $7`,
          [
            integrations.whatsapp_cloud_api ? JSON.stringify(integrations.whatsapp_cloud_api) : null,
            integrations.meta_business ? JSON.stringify(integrations.meta_business) : null,
            integrations.google_ads ? JSON.stringify(integrations.google_ads) : null,
            integrations.firebase ? JSON.stringify(integrations.firebase) : null,
            integrations.smtp ? JSON.stringify(integrations.smtp) : null,
            integrations.payment_gateway ? JSON.stringify(integrations.payment_gateway) : null,
            id
          ]
        );
      }

      // Log activity
      await client.query(
        `INSERT INTO customer_activity (customer_id, action, user_id, details) VALUES ($1, $2, $3, $4)`,
        [id, 'customer_updated', req.user?.id || null, JSON.stringify({ name })]
      );

      await client.query('COMMIT');
      res.json({ message: 'Customer updated successfully' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  },

  async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only operation' });
      }
      await query('DELETE FROM customers WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getCustomerActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (req.user?.role !== 'admin') {
        const userRes = await query('SELECT customer_id FROM users WHERE id = $1', [req.user?.id]);
        if (userRes.rows[0]?.customer_id !== id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      const logs = await query('SELECT * FROM customer_activity WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50', [id]);
      res.json(logs.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
