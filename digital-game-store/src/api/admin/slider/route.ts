import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Disable authentication for development
export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const sliderModule = req.scope.resolve('slider') as any
    
    const { is_active } = req.query

    const slides = await sliderModule.listSlides({
      ...(is_active !== undefined && { is_active: is_active === 'true' }),
    })

    res.json({ slides })
  } catch (error: any) {
    console.error('Admin Slider GET error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      message: 'Failed to fetch slides',
      error: error.message,
      details: error.stack
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const sliderModule = req.scope.resolve('slider') as any

    const { title, subtitle, image_url, link_url, button_text, order } = req.body as any

    if (!title || !image_url || !link_url) {
      return res.status(400).json({
        message: 'Missing required fields: title, image_url, link_url',
      })
    }

    const slide = await sliderModule.createSlide({
      title,
      subtitle,
      image_url,
      link_url,
      button_text,
      order,
    })

    res.status(201).json({ slide })
  } catch (error: any) {
    console.error('Admin Slider POST error:', error)
    res.status(500).json({ 
      message: 'Failed to create slide',
      error: error.message 
    })
  }
}
