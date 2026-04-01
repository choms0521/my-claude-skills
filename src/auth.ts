import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}

export async function login(username: string, password: string, db: any) {
  const user = await db.raw(
    'SELECT * FROM users WHERE username = ?',
    [username]
  )

  if (user && await bcrypt.compare(password, user.password)) {
    const secret = getJwtSecret()
    const token = generateToken(user, secret)
    const { password: _, ...safeUser } = user
    return { token, user: safeUser }
  }

  return null
}

export function validateToken(token: string) {
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret)
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token', { cause: error })
  }
}

export async function changePassword(userId: string, newPassword: string, db: any) {
  const hashed = await hashPassword(newPassword)
  const result = await db.raw(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashed, userId]
  )
  return result
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

function generateToken(user: any, secret: string) {
  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: 86400 }
  )
}
