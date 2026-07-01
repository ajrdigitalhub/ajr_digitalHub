import { Request, Response } from 'express';
import { query, pool } from '../db';

// Memory fallback store
let mockLeads: any[] = [
  { id: 'lead-1', email: 'john@acme.com', full_name: 'John Doe', phone: '+1234567890', company_name: 'Acme Corp', status: 'New', source: 'Website Form', score: 85, created_at: new Date() },
  { id: 'lead-2', email: 'alice@tesla.com', full_name: 'Alice Smith', phone: '+1987654321', company_name: 'Tesla Inc', status: 'Contacted', source: 'Google Ads', score: 95, created_at: new Date() }
];

let mockContacts: any[] = [
  { id: 'contact-1', email: 'bob@apple.com', full_name: 'Bob Johnson', phone: '+1122334455', company: 'Apple', created_at: new Date() }
];

let mockDeals: any[] = [
  { id: 'deal-1', title: 'Tesla Enterprise Pilot', value: 50000.00, stage: 'Prospect', contact_id: 'contact-1', created_at: new Date() }
];

let mockActivities: any[] = [
  { id: 'activity-1', deal_id: 'deal-1', type: 'Call', description: 'Discussed pricing models.', created_at: new Date() }
];

export const crmController = {
  async getLeads(req: Request, res: Response) {
    try {
      if (!pool) {
        res.json(mockLeads);
        return;
      }
      const result = await query('SELECT * FROM crm_leads ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createLead(req: Request, res: Response) {
    try {
      const { email, full_name, phone, company_name, status, source, score } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      if (!pool) {
        const newLead = {
          id: `lead_${Date.now()}`,
          email,
          full_name,
          phone,
          company_name,
          status: status || 'New',
          source: source || 'Manual',
          score: score || 0,
          created_at: new Date()
        };
        mockLeads.push(newLead);
        res.status(201).json(newLead);
        return;
      }

      const result = await query(
        `INSERT INTO crm_leads (workspace_id, email, full_name, phone, company_name, status, source, score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [workspace_id, email, full_name, phone, company_name, status || 'New', source || 'Manual', score || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, score, assigned_user_id } = req.body;

      if (!pool) {
        const lead = mockLeads.find(l => l.id === id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (status !== undefined) lead.status = status;
        if (score !== undefined) lead.score = score;
        if (assigned_user_id !== undefined) lead.assigned_user_id = assigned_user_id;
        res.json(lead);
        return;
      }

      const result = await query(
        `UPDATE crm_leads SET status = COALESCE($1, status), score = COALESCE($2, score), assigned_user_id = COALESCE($3, assigned_user_id) 
         WHERE id = $4 RETURNING *`,
        [status, score, assigned_user_id, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async deleteLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!pool) {
        const index = mockLeads.findIndex(l => l.id === id);
        if (index === -1) return res.status(404).json({ error: 'Lead not found' });
        mockLeads.splice(index, 1);
        res.json({ success: true });
        return;
      }
      const result = await query('DELETE FROM crm_leads WHERE id = $1', [id]);
      res.json({ success: (result.rowCount || 0) > 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getContacts(req: Request, res: Response) {
    try {
      if (!pool) {
        res.json(mockContacts);
        return;
      }
      const result = await query('SELECT * FROM crm_contacts ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createContact(req: Request, res: Response) {
    try {
      const { email, full_name, phone, company } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      if (!pool) {
        const newContact = {
          id: `contact_${Date.now()}`,
          email,
          full_name,
          phone,
          company,
          created_at: new Date()
        };
        mockContacts.push(newContact);
        res.status(201).json(newContact);
        return;
      }

      const result = await query(
        `INSERT INTO crm_contacts (workspace_id, email, full_name, phone) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [workspace_id, email, full_name, phone]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getDeals(req: Request, res: Response) {
    try {
      if (!pool) {
        res.json(mockDeals);
        return;
      }
      const result = await query('SELECT * FROM crm_deals ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createDeal(req: Request, res: Response) {
    try {
      const { title, value, stage, contact_id, lead_id } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      if (!pool) {
        const newDeal = {
          id: `deal_${Date.now()}`,
          title,
          value: parseFloat(value) || 0.00,
          stage: stage || 'Prospect',
          contact_id,
          lead_id,
          created_at: new Date()
        };
        mockDeals.push(newDeal);
        res.status(201).json(newDeal);
        return;
      }

      const result = await query(
        `INSERT INTO crm_deals (workspace_id, title, value, stage, contact_id, lead_id) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [workspace_id, title, parseFloat(value) || 0.00, stage || 'Prospect', contact_id, lead_id]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateDealStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      if (!pool) {
        const deal = mockDeals.find(d => d.id === id);
        if (!deal) return res.status(404).json({ error: 'Deal not found' });
        deal.stage = stage;
        res.json(deal);
        return;
      }

      const result = await query(
        `UPDATE crm_deals SET stage = $1 WHERE id = $2 RETURNING *`,
        [stage, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Deal not found' });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getActivities(req: Request, res: Response) {
    try {
      if (!pool) {
        res.json(mockActivities);
        return;
      }
      const result = await query('SELECT * FROM crm_activities ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createActivity(req: Request, res: Response) {
    try {
      const { deal_id, lead_id, contact_id, type, description } = req.body;
      const workspace_id = req.tenantContext?.workspaceId || 'ws-default-sandbox-id';

      if (!pool) {
        const newAct = {
          id: `act_${Date.now()}`,
          deal_id,
          lead_id,
          contact_id,
          type,
          description,
          created_at: new Date()
        };
        mockActivities.push(newAct);
        res.status(201).json(newAct);
        return;
      }

      const result = await query(
        `INSERT INTO crm_activities (workspace_id, deal_id, lead_id, contact_id, type, description) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [workspace_id, deal_id, lead_id, contact_id, type, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
