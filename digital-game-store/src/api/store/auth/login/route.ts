import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

/**
 * POST /store/auth/login
 * Customer login endpoint
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    // Get customer module
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any

    // Find customer by email
    const customers = await customerModuleService.listCustomers({
      email,
    })

    if (!customers || customers.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const customer = customers[0]

    // Check if customer has an account
    if (!customer.has_account) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    // Verify password (stored in metadata for development)
    // In production, use bcrypt.compare()
    const storedPassword = customer.metadata?.password_hash
    if (!storedPassword || storedPassword !== password) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    // Create a simple session token (in production, use JWT or proper session management)
    const sessionToken = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64')

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        has_account: customer.has_account,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        metadata: customer.metadata,
      },
      token: sessionToken,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({
      message: 'Login failed',
      error: error.message,
    })
  }
}

