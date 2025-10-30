import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Disable authentication for development
export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sliderModule = req.scope.resolve('slider') as any
  const { id } = req.params

  try {
    const slide = await sliderModule.getSlide(id)
    res.json({ slide })
  } catch (error) {
    res.status(404).json({ message: 'Slide not found' })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sliderModule = req.scope.resolve('slider') as any
  const { id } = req.params

  const { title, subtitle, image_url, link_url, button_text, order, is_active } = req.body as any

  try {
    const slide = await sliderModule.updateSlide(id, {
      ...(title && { title }),
      ...(subtitle !== undefined && { subtitle }),
      ...(image_url && { image_url }),
      ...(link_url && { link_url }),
      ...(button_text !== undefined && { button_text }),
      ...(order !== undefined && { order }),
      ...(is_active !== undefined && { is_active }),
    })

    res.json({ slide })
  } catch (error) {
    res.status(400).json({ message: 'Failed to update slide', error })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const sliderModule = req.scope.resolve('slider') as any
  const { id } = req.params

  try {
    await sliderModule.deleteSlide(id)
    res.json({ message: 'Slide deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete slide', error })
  }
}
