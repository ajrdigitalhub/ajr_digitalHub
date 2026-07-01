import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, isPostgresEnabled } from '../../config/db';
import { BaseService } from '../../core/base.service';

const JWT_SECRET = process.env['JWT_SECRET'] || 'ajr-super-secret-jwt-key-2026';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'ajr-super-refresh-secret-jwt-key-2026';

export const authController = {
  async login(req: Request, res: Response): Promise<any> {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      let user: any = null;
      if (isPostgresEnabled) {
        const result = await query('SELECT id, data FROM records WHERE collection = $1 AND data->>\'email\' = $2', ['users', email]);
        if (result.rowCount && result.rowCount > 0) {
          user = { id: result.rows[0].id, ...result.rows[0].data };
        }
      } else {
        const service = new BaseService('users');
        const result = await service.findAll();
        user = result.data.find((u: any) => u.email === email);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid && password !== user.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName || user.email.split('@')[0]
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  },

  async register(req: Request, res: Response): Promise<any> {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      let existingUser: any = null;
      if (isPostgresEnabled) {
        const result = await query('SELECT id FROM records WHERE collection = $1 AND data->>\'email\' = $2', ['users', email]);
        if (result.rowCount && result.rowCount > 0) {
          existingUser = result.rows[0];
        }
      } else {
        const service = new BaseService('users');
        const result = await service.findAll();
        existingUser = result.data.find((u: any) => u.email === email);
      }

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        email,
        password: hashedPassword,
        role: role || 'user',
        fullName: email.split('@')[0],
        created_at: new Date().toISOString()
      };

      let createdUser: any = null;
      if (isPostgresEnabled) {
        const insertRes = await query(
          'INSERT INTO records (collection, data) VALUES ($1, $2) RETURNING id, data',
          ['users', JSON.stringify(userData)]
        );
        createdUser = { id: insertRes.rows[0].id, ...insertRes.rows[0].data };
      } else {
        const service = new BaseService('users');
        createdUser = await service.create(userData);
      }

      return res.json({
        success: true,
        message: 'Registration successful',
        user: {
          id: createdUser.id,
          email: createdUser.email,
          role: createdUser.role,
          fullName: createdUser.fullName
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  },

  async refresh(req: Request, res: Response): Promise<any> {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const newPayload = { id: payload.id, email: payload.email, role: payload.role };
      const accessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '24h' });
      
      return res.json({ accessToken });
    } catch (error) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
  },

  async logout(req: Request, res: Response): Promise<any> {
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out successfully' });
  }
};
