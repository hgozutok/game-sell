import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  Logger,
  NotificationTypes,
} from "@medusajs/framework/types"

type InjectedDependencies = {
  logger: Logger
}

// Dev fallback notification provider: mail gondermek yerine icerigi loglar.
// SENDGRID_API_KEY tanimli degilse medusa-config tarafindan kaydedilir.
class NotificationLoggerProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-logger"
  protected logger_: Logger

  constructor(
    { logger }: InjectedDependencies,
    options: Record<string, any> = {}
  ) {
    super()
    this.logger_ = logger
  }

  static validateOptions(options: Record<any, any>): void | never {
    void options
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    this.logger_.info(
      `[notification-logger] (dev fallback) to=${notification.to} template=${notification.template ?? ""} subject=${(notification as any).subject ?? ""}`
    )
    this.logger_.debug(
      `[notification-logger] data keys=${notification.data ? Object.keys(notification.data).join(",") : ""}`
    )
    return { id: `logger-${Date.now()}` }
  }
}

// MedusaError importu kalmasin diye kullaniyor olmayan satirlari engelle
void MedusaError

export default NotificationLoggerProviderService
