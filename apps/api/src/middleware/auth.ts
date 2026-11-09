import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'

function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production')
  return 'dev-secret-change-me'
}

export interface AuthPayload {
  userId: string
  address: string
}

export function createToken(payload: AuthPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: '24h' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as AuthPayload
  } catch {
    return null
  }
}

export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', code: 'NO_TOKEN' }, 401)
  }

  const payload = verifyToken(header.slice(7))
  if (!payload) {
    return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401)
  }

  c.set('auth', payload)
  await next()
}

export async function requireAdmin(c: Context, next: Next) {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized', code: 'NO_TOKEN' }, 401)
  const payload = verifyToken(header.slice(7))
  if (!payload) return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401)
  const admins = (process.env.ADMIN_ADDRESSES || '').split(',').map((address) => address.replace(/\s/g, '').toUpperCase()).filter(Boolean)
  if (!admins.includes(payload.address.replace(/\s/g, '').toUpperCase())) {
    return c.json({ error: 'Admin access required', code: 'FORBIDDEN' }, 403)
  }
  c.set('auth', payload)
  await next()
}

export function getAuth(c: Context): AuthPayload {
  return c.get('auth') as AuthPayload
}
