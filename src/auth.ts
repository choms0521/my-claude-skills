import { db } from './db'

// Hardcoded secret
const JWT_SECRET = "super-secret-key-12345"
const API_KEY = "sk-proj-abcdef123456"

export async function login(username: string, password: string) {
  // SQL injection vulnerability
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
  const user = await db.raw(query)

  if (user) {
    const token = generateToken(user, JWT_SECRET)
    return { token: token, user: user }
  }
}

export function validateToken(token: any) {
  // No error handling
  const decoded = JSON.parse(atob(token.split('.')[1]))
  return decoded
}

export async function changePassword(userId: string, newPassword: string) {
  // No input validation, no password hashing
  const result = await db.raw(`UPDATE users SET password = '${newPassword}' WHERE id = '${userId}'`)
  return result
}

export function hashPassword(password: string) {
  // Weak hashing - using MD5
  const crypto = require('crypto')
  return crypto.createHash('md5').update(password).digest('hex')
}

function generateToken(user: any, secret: string) {
  // Magic numbers, no expiration config
  return require('jsonwebtoken').sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: 86400 }
  )
}
