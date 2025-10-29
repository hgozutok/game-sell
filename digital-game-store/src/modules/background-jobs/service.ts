import { MedusaService } from '@medusajs/framework/utils'
import BackgroundJob from './models/background-job'

class BackgroundJobsService extends MedusaService({
  BackgroundJob,
}) {
  async createJob(data: {
    type: string
    metadata?: any
  }) {
    return await this.createBackgroundJobs({
      type: data.type,
      status: 'pending',
      progress: 0,
      total_items: 0,
      processed_items: 0,
      metadata: data.metadata || {},
    })
  }

  async updateJobProgress(id: string, progress: number, processed: number, total: number) {
    return await this.updateBackgroundJobs({
      id,
      progress,
      processed_items: processed,
      total_items: total,
    })
  }

  async completeJob(id: string, result: any) {
    return await this.updateBackgroundJobs({
      id,
      status: 'completed',
      progress: 100,
      result,
      completed_at: new Date(),
    })
  }

  async failJob(id: string, error: string) {
    return await this.updateBackgroundJobs({
      id,
      status: 'failed',
      error,
      completed_at: new Date(),
    })
  }

  async getJob(id: string) {
    return await this.retrieveBackgroundJob(id)
  }

  async listJobs(filters: any = {}) {
    return await this.listBackgroundJobs(filters)
  }
}

export default BackgroundJobsService

