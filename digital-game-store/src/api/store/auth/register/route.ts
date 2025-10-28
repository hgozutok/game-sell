import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from "@medusajs/framework/utils"

// POST /store/auth/register - Create customer (registration) - NO AUTH REQUIRED
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const logger = req.scope.resolve("logger")
  
  try {
    const body = req.body as {
      email: string
      password: string
      first_name: string
      last_name: string
      phone?: string
    }
    
    const { email, password, first_name, last_name, phone } = body

    logger.info("📝 Registration attempt for: " + email)

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        type: 'invalid_data',
        message: 'Email, password, first_name, and last_name are required'
      })
    }

    // Check if customer already exists
    const existing = await customerModuleService.listCustomers({ email })
    if (existing && existing.length > 0) {
      return res.status(400).json({
        type: 'duplicate_error',
        message: 'A customer with this email already exists'
      })
    }

    // Create customer
    const customer = await customerModuleService.createCustomers({
      email,
      first_name,
      last_name,
      phone: phone || null,
      has_account: true,
      metadata: {
        // Note: Password should be properly hashed in production!
        // For now, we're just storing it in metadata for development
        password_hash: password
      }
    })

    logger.info("✅ Customer created: " + customer.id)

    res.status(201).json({ customer })
  } catch (error: any) {
    logger.error("❌ Registration error:", error)
    
    res.status(500).json({
      type: 'unknown_error',
      message: error.message || 'Failed to create customer'
    })
  }
}

