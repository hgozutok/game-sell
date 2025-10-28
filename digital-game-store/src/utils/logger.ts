import winston from "winston"

const logLevel = process.env.LOG_LEVEL || "info"

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "digital-game-store" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

// Add CloudWatch transport in production
if (process.env.NODE_ENV === "production" && process.env.AWS_REGION) {
  const WinstonCloudWatch = require("winston-cloudwatch")
  
  logger.add(
    new WinstonCloudWatch({
      logGroupName: process.env.CLOUDWATCH_GROUP_NAME || "/medusa/production",
      logStreamName: process.env.CLOUDWATCH_STREAM_NAME || "api",
      awsRegion: process.env.AWS_REGION,
      jsonMessage: true,
    })
  )
}

export default logger

