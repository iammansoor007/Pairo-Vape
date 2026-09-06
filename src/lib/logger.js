import pino from 'pino';

// Define standard error categories for the Promotion Engine
export const LogCategory = {
    ENGINE_EVAL: 'PROMO_EVAL',
    CHECKOUT_TRANSACTION: 'CHECKOUT_TX',
    INVENTORY_RESERVATION: 'INV_RESERVE',
    PROMO_RESERVATION: 'PROMO_RESERVE',
    CACHE_OPERATIONS: 'CACHE_OP',
    SECURITY_HARDENING: 'SEC_HARDEN'
};

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        env: process.env.NODE_ENV,
        service: 'uvape-promotion-engine'
    },
    // In development, use pino-pretty for human readability
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined
});

/**
 * Creates a child logger with a correlation ID for request tracing.
 */
export const getContextLogger = (correlationId, additionalContext = {}) => {
    return logger.child({
        correlationId,
        ...additionalContext
    });
};

export default logger;
