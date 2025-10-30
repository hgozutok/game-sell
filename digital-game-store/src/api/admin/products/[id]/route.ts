import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

// Disable authentication for development
export const AUTHENTICATE = false

// DELETE /admin/products/:id - Delete/Archive a product
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const { id } = req.params

    // Archive product by setting deleted_at
    await productModule.updateProducts(id, {
      deleted_at: new Date(),
      status: 'draft', // Set to draft when archiving
    })

    res.json({
      message: 'Product archived successfully',
      id,
    })
  } catch (error: any) {
    console.error('Failed to archive product:', error)
    res.status(500).json({
      message: 'Failed to archive product',
      error: error.message,
    })
  }
}

