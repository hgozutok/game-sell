import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Disable authentication for development
export const AUTHENTICATE = false

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sliderModule = req.scope.resolve('slider') as any

  const { slides } = req.body as any

  if (!Array.isArray(slides)) {
    return res.status(400).json({
      message: 'Invalid request: slides must be an array',
    })
  }

  try {
    await sliderModule.reorderSlides(slides)
    res.json({ message: 'Slides reordered successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to reorder slides', error })
  }
}

