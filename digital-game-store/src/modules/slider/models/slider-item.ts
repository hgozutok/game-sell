import { model } from "@medusajs/framework/utils"

const SliderItem = model.define("slider_item", {
  id: model.id().primaryKey(),
  title: model.text(),
  subtitle: model.text().nullable(),
  image_url: model.text(),
  link_url: model.text(),
  button_text: model.text().default("Learn More"),
  order: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default SliderItem

