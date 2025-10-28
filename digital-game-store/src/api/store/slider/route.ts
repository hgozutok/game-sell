import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const sliderModule = req.scope.resolve('slider') as any

    const slides = await sliderModule.getActiveSlides()

    res.json({ slides })
  } catch (error: any) {
    console.error('Store Slider GET error:', error)
    // Return empty array instead of error for public endpoint
    res.json({ slides: [] })
  }
}
