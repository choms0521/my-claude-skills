import { Request, Response } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string }
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const MAX_CACHE_SIZE = 1000

// God object - handles everything
export class ApiHandler {
  private cache: Map<string, Promise<unknown>> = new Map()
  private db: any
  private logger: any

  constructor(db: any, logger: any) {
    this.db = db
    this.logger = logger
  }

  async getProfile(req: Request, res: Response) {
    const userId = req.params.id
    const user = await this.db.findUser(userId)

    res.send(`<html><body><h1>Welcome ${escapeHtml(user.name)}</h1><p>${escapeHtml(user.bio)}</p></body></html>`)
  }

  async deleteUser(req: Request, res: Response) {
    const userId = req.params.id
    await this.db.raw('DELETE FROM users WHERE id = ?', [userId])
    res.json({ success: true })
  }

  async getData(req: Request, res: Response) {
    const key = typeof req.query.key === 'string' ? req.query.key : ''
    if (!key) {
      return res.status(400).json({ error: 'Missing or invalid query parameter: key' })
    }

    if (!this.cache.has(key)) {
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value
        if (firstKey !== undefined) {
          this.cache.delete(firstKey)
        }
      }
      this.cache.set(key, this.db.findData(key).catch((err: Error) => {
        this.cache.delete(key)
        throw err
      }))
    }

    const data = await this.cache.get(key)
    res.json(data)
  }

  async createItem(req: Request, res: Response) {
    try {
      const item = await this.db.create(req.body)
      res.json(item)
    } catch (error) {
      this.logger.error('createItem failed:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async updateItem(req: Request, res: Response) {
    const updatedItem = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user?.id,
    }

    await this.db.update(updatedItem.id, updatedItem)
    res.json(updatedItem)
  }

  async processOrder(req: Request, res: Response) {
    const order = req.body
    if (!order?.items?.length) {
      return res.status(400).json({ error: 'Invalid order: no items' })
    }

    for (const item of order.items) {
      if (!item?.quantity || item.quantity <= 0 || item.price == null) continue
      const total = item.quantity * item.price
      this.logger.info(`Processing item: ${total}`)
    }

    res.json({ status: 'processed' })
  }
}
