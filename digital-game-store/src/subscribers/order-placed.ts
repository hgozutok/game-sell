import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({ event, container }: SubscriberArgs<any>) {
  const logger = container.resolve("logger")
  const orderModuleService = container.resolve(Modules.ORDER)
  const { fulfillDigitalOrderWorkflow } = await import("../workflows/fulfill-digital-order.js")

  const orderId = event.data.id

  try {
    // Fetch order details
    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ["items", "items.variant", "items.product"],
    })

    // Check if order contains digital products
    const digitalItems = order.items.filter((item: any) => {
      return item.product?.metadata?.is_digital === true
    })

    if (digitalItems.length === 0) {
      logger.info(`Order ${orderId} contains no digital products, skipping key fulfillment`)
      return
    }

    logger.info(`Processing digital key fulfillment for order ${orderId}`)

    // Prepare workflow input
    const workflowInput = {
      orderId: order.id,
      customerId: order.customer_id,
      items: digitalItems.map((item: any) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        lineItemId: item.id,
      })),
    }

    // Execute fulfillment workflow
    await fulfillDigitalOrderWorkflow(container).run({
      input: workflowInput,
    })

    logger.info(`Digital key fulfillment completed for order ${orderId}`)
  } catch (error: any) {
    logger.error(`Failed to fulfill digital keys for order ${orderId}: ${error.message}`)
    // TODO: Add to failed jobs queue for retry
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

