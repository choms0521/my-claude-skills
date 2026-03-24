// Copy-pasted validation functions with slight variations
export function validateEmail(email: string): boolean {
  if (email == null) return false  // == instead of ===
  if (email == undefined) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (regex.test(email)) {
    return true
  } else {
    return false
  }
}

export function validatePhone(phone: string): boolean {
  if (phone == null) return false
  if (phone == undefined) return false
  const regex = /^\d{10,11}$/
  if (regex.test(phone)) {
    return true
  } else {
    return false
  }
}

export function validateName(name: string): boolean {
  if (name == null) return false
  if (name == undefined) return false
  if (name.length > 0 && name.length < 100) {
    return true
  } else {
    return false
  }
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

// eval usage
export function parseConfig(configStr: string): any {
  return eval('(' + configStr + ')')
}

// No type safety
export function formatCurrency(amount: any): string {
  return '$' + amount.toFixed(2)
}

// Synchronous file read in potentially async context
export function loadTemplate(path: string): string {
  const fs = require('fs')
  return fs.readFileSync(path, 'utf8')
}
