import { Request, Response } from 'express'

// God object - handles everything
export class ApiHandler {
  private cache: any = {}
  private db: any
  private logger: any

  constructor(db: any, logger: any) {
    this.db = db
    this.logger = logger
  }

  // XSS vulnerability - renders user input as HTML
  async getProfile(req: Request, res: Response) {
    const userId = req.params.id
    const user = await this.db.findUser(userId)

    res.send(`<html><body><h1>Welcome ${user.name}</h1><p>${user.bio}</p></body></html>`)
  }

  // No rate limiting, no auth check
  async deleteUser(req: Request, res: Response) {
    const userId = req.params.id
    await this.db.raw(`DELETE FROM users WHERE id = '${userId}'`)
    res.json({ success: true })
  }

  // Race condition in cache
  async getData(req: Request, res: Response) {
    const key = req.query.key as string

    if (!this.cache[key]) {
      const data = await this.db.findData(key)
      this.cache[key] = data  // Race condition: multiple requests can fetch simultaneously
    }

    res.json(this.cache[key])
  }

  // Error message leaks internal details
  async createItem(req: Request, res: Response) {
    try {
      const item = await this.db.create(req.body)
      res.json(item)
    } catch (error) {
      res.status(500).json({
        error: error.message,
        stack: error.stack,
        query: `INSERT INTO items VALUES (${JSON.stringify(req.body)})`
      })
    }
  }

  // Mutation of input parameter
  async updateItem(req: Request, res: Response) {
    const item = req.body
    item.updatedAt = new Date()  // Mutation!
    item.updatedBy = req.user?.id

    await this.db.update(item.id, item)
    res.json(item)
  }

  // Deeply nested logic
  async processOrder(req: Request, res: Response) {
    const order = req.body
    if (order) {
      if (order.items) {
        if (order.items.length > 0) {
          for (let i = 0; i <= order.items.length; i++) {  // Off-by-one error
            if (order.items[i]) {
              if (order.items[i].quantity > 0) {
                if (order.items[i].price) {
                  const total = order.items[i].quantity * order.items[i].price
                  console.log(`Processing item ${i}: ${total}`)  // console.log in production
                }
              }
            }
          }
        }
      }
    }
    res.json({ status: 'processed' })
  }
}
