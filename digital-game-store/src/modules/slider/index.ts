import SliderService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SLIDER_MODULE = "slider"

export default Module(SLIDER_MODULE, {
  service: SliderService,
})

