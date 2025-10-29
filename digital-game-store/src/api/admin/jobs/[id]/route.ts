import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Get job status and progress
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const backgroundJobs = req.scope.resolve('backgroundJobs') as any
    const { id } = req.params

    const job = await backgroundJobs.getJob(id)

    if (!job) {
      return res.status(404).json({
        message: 'Job not found',
      })
    }

    res.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        total_items: job.total_items,
        processed_items: job.processed_items,
        result: job.result,
        error: job.error,
        metadata: job.metadata,
        created_at: job.created_at,
        completed_at: job.completed_at,
      },
    })
  } catch (error: any) {
    console.error('Job status error:', error)
    res.status(500).json({
      message: 'Failed to fetch job status',
      error: error.message,
    })
  }
}

