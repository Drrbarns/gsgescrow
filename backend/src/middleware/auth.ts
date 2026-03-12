import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { supabaseAdmin } from '../services/supabase';
import { AuthUser, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub: string; phone?: string; role?: string };
    const userId = decoded.sub;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, phone')
      .eq('user_id', userId)
      .single();

    req.user = {
      id: userId,
      phone: profile?.phone || decoded.phone || '',
      role: (profile?.role as UserRole) || 'buyer',
    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub: string };
      req.user = { id: decoded.sub, phone: '', role: 'buyer' };
    } catch { /* ignore */ }
  }

  next();
}
