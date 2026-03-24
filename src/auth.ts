import { db } from './db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export async function login(username: string, password: string) {
  const user = await db.raw(
    'SELECT * FROM users WHERE username = ?',
    [username]
  )

  if (user && await bcrypt.compare(password, user.password)) {
    const token = generateToken(user, JWT_SECRET)
    return { token, user }
  }

  return null
}

export function validateToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export async function changePassword(userId: string, newPassword: string) {
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
