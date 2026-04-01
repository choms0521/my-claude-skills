import { promises as fs } from 'fs'

export function validateEmail(email: string | null | undefined): boolean {
  if (email === null || email === undefined) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string | null | undefined): boolean {
  if (phone === null || phone === undefined) return false
  return /^\d{10,11}$/.test(phone)
}

export function validateName(name: string | null | undefined): boolean {
  if (name === null || name === undefined) return false
  return name.length > 0 && name.length < 100
}

export function parseConfig<T = unknown>(configStr: string): T {
  try {
    return JSON.parse(configStr) as T
  } catch (error) {
    throw new Error(`Invalid config JSON: ${(error as Error).message}`)
  }
}

export function formatCurrency(amount: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

import path from 'path'

const TEMPLATE_DIR = path.resolve(__dirname, '../templates')

export async function loadTemplate(templatePath: string): Promise<string> {
  const resolved = path.resolve(TEMPLATE_DIR, templatePath)
  if (!resolved.startsWith(TEMPLATE_DIR + path.sep) && resolved !== TEMPLATE_DIR) {
    throw new Error('Invalid template path: path traversal detected')
  }
  return await fs.readFile(resolved, 'utf8')
}
