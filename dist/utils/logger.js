"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logError = logError;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
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
function logError(context, error) {
    if (error instanceof Error) {
        exports.logger.error({
            context,
            error: error.message,
            stack: error.stack,
        });
    }
    else {
        exports.logger.error({ context, error });
    }
}
function logInfo(context, message, data) {
    exports.logger.info({ context, message, ...data });
}
function logWarn(context, message, data) {
    exports.logger.warn({ context, message, ...data });
}
