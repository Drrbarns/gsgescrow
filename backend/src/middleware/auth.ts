import { Request, Response, NextFunction } from 'express';
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
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) throw new Error('Invalid token');
    const userId = authUser.id;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, phone')
      .eq('user_id', userId)
      .single();

    const baseUser: AuthUser = {
      id: userId,
      phone: profile?.phone || authUser.phone || '',
      role: (profile?.role as UserRole) || 'buyer',
    };

    const impersonationToken = req.headers['x-impersonation-token'];
    const normalizedImpersonationToken = Array.isArray(impersonationToken)
      ? impersonationToken[0]
      : impersonationToken;

    if (normalizedImpersonationToken && isSuperadminRole(baseUser.role)) {
      const nowIso = new Date().toISOString();
      const { data: session } = await supabaseAdmin
        .from('impersonation_sessions')
        .select('id, target_user_id, status, expires_at')
        .eq('session_token', normalizedImpersonationToken)
        .eq('impersonator_id', baseUser.id)
        .single();

      if (session && session.status === 'ACTIVE' && session.expires_at > nowIso) {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('role, phone')
          .eq('user_id', session.target_user_id)
          .single();

        if (targetProfile) {
          req.user = {
            id: session.target_user_id as string,
            phone: targetProfile.phone || '',
            role: (targetProfile.role as UserRole) || 'buyer',
            impersonator_id: baseUser.id,
            is_impersonation: true,
            impersonation_session_id: session.id as string,
          };

          try {
            await supabaseAdmin.from('admin_sessions').insert({
              user_id: baseUser.id,
              role: baseUser.role,
              session_kind: 'IMPERSONATION',
              status: 'ACTIVE',
              last_seen_at: new Date().toISOString(),
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
              metadata: {
                impersonation_session_id: session.id,
                target_user_id: session.target_user_id,
              },
            });
          } catch {
            // non-blocking telemetry
          }

          next();
          return;
        }
      }
    }

    req.user = baseUser;

    if (isPrivilegedRole(baseUser.role)) {
      try {
        await supabaseAdmin.from('admin_sessions').insert({
          user_id: baseUser.id,
          role: baseUser.role,
          session_kind: 'ADMIN',
          status: 'ACTIVE',
          last_seen_at: new Date().toISOString(),
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
      } catch {
        // non-blocking telemetry
      }
    }

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

export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !isPrivilegedRole(req.user.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }
  next();
}

export async function requireSuperadmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(403).json({ error: 'Superadmin access required' });
    return;
  }

  if (isSuperadminRole(req.user.role)) {
    next();
    return;
  }

  if (req.user.is_impersonation && req.user.impersonator_id) {
    const { data: impersonatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', req.user.impersonator_id)
      .single();

    if (isSuperadminRole(impersonatorProfile?.role as UserRole)) {
      next();
      return;
    }
  }

  res.status(403).json({ error: 'Superadmin access required' });
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);
      if (authUser) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role, phone')
          .eq('user_id', authUser.id)
          .single();

        req.user = {
          id: authUser.id,
          phone: profile?.phone || authUser.phone || '',
          role: (profile?.role as UserRole) || 'buyer',
        };
      }
    } catch { /* ignore */ }
  }

  next();
}

export function isPrivilegedRole(role?: UserRole): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function isSuperadminRole(role?: UserRole): boolean {
  return role === 'superadmin';
}
