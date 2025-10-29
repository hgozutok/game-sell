import { Module } from "@medusajs/framework/utils"
import BackgroundJobsService from "./service"

export const BACKGROUND_JOBS_MODULE = "backgroundJobs"

export default Module(BACKGROUND_JOBS_MODULE, {
  service: BackgroundJobsService,
})

