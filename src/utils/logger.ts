import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        }
      : undefined,
});

export function logError(context: string, error: unknown) {
  if (error instanceof Error) {
    logger.error({
      context,
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.error({ context, error });
  }
}

export function logInfo(context: string, message: string, data?: any) {
  logger.info({ context, message, ...data });
}

export function logWarn(context: string, message: string, data?: any) {
  logger.warn({ context, message, ...data });
}
