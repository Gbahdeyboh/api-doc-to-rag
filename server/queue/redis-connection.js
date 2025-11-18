import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

// Centralized Redis connection for BullMQ
let connection = null;

/**
 * Get or create the Redis connection
 * @returns {IORedis} Redis connection instance
 */
export function getRedisConnection() {
    if (connection) {
        return connection;
    }

    // Create connection based on available environment variables
    if (process.env.REDIS_URL) {
        connection = new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            retryStrategy: times => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            connectTimeout: 10000,
            lazyConnect: false,
        });
    } else {
        connection = new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: null,
            retryStrategy: times => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            connectTimeout: 10000,
            lazyConnect: false,
        });
    }

    // Connection event handlers
    connection.on('error', error => {
        logger.error('Redis connection error', {
            error: error.message,
            code: error.code,
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
        });
    });

    connection.on('connect', () => {
        logger.info('Redis connected successfully', {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            usingUrl: !!process.env.REDIS_URL,
        });
    });

    connection.on('ready', () => {
        logger.info('Redis connection ready');
    });

    connection.on('close', () => {
        logger.warn('Redis connection closed');
    });

    connection.on('reconnecting', delay => {
        logger.info('Redis reconnecting', { delay });
    });

    return connection;
}

/**
 * Close the Redis connection
 * Useful for graceful shutdown
 */
export async function closeRedisConnection() {
    if (connection) {
        await connection.quit();
        connection = null;
        logger.info('Redis connection closed');
    }
}

// Export the connection getter as default for convenience
export default getRedisConnection;
