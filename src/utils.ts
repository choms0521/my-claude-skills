import { promises as fs } from 'fs'

export function validateEmail(email: string): boolean {
  if (email === null || email === undefined) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  if (phone === null || phone === undefined) return false
  return /^\d{10,11}$/.test(phone)
}

export function validateName(name: string): boolean {
  if (name === null || name === undefined) return false
  return name.length > 0 && name.length < 100
}

// Unused function
export function legacyHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
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

export async function loadTemplate(path: string): Promise<string> {
  return await fs.readFile(path, 'utf8')
}
