import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

// Centralized Redis connection for BullMQ
let connection = null;

/**
 * Parse REDIS_URL to extract connection options
 * Handles Redis URLs which may include TLS requirements
 */
function parseRedisUrl(url) {
    try {
        const parsed = new URL(url);
        const options = {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379'),
            password: parsed.password || undefined,
            maxRetriesPerRequest: null,
            retryStrategy: times => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            connectTimeout: 30000, // Increased for external connections
            lazyConnect: false,
        };

        // Redis may typically requires TLS for external connections
        // Check if URL uses rediss:// (Redis over TLS) or if port is 6380
        if (parsed.protocol === 'rediss:' || parsed.port === '6380') {
            options.tls = {
                rejectUnauthorized: false,
            };
            logger.info('Configuring Redis connection with TLS', {
                host: parsed.hostname,
                port: parsed.port,
            });
        }

        return options;
    } catch (error) {
        logger.error('Failed to parse REDIS_URL', {
            error: error.message,
            url: url ? url.replace(/:[^:@]+@/, ':****@') : 'undefined', // Mask password in logs
        });
        return null;
    }
}

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
        const options = parseRedisUrl(process.env.REDIS_URL);

        if (options) {
            // Use parsed options for better TLS handling
            connection = new IORedis(options);
        } else {
            // Fallback to direct URL parsing (IORedis handles it)
            logger.warn('Using fallback Redis URL connection (may not support TLS properly)');
            connection = new IORedis(process.env.REDIS_URL, {
                maxRetriesPerRequest: null,
                retryStrategy: times => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                connectTimeout: 30000,
                lazyConnect: false,
            });
        }
    } else {
        connection = new IORedis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
            retryStrategy: times => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            connectTimeout: 10000,
            lazyConnect: false,
        });
    }

    // Connection event handlers with detailed logging
    connection.on('error', error => {
        logger.error('Redis connection error', {
            error: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port,
            host: process.env.REDIS_HOST || 'localhost',
            hasRedisUrl: !!process.env.REDIS_URL,
        });
    });

    connection.on('connect', () => {
        const host = connection.options?.host || process.env.REDIS_HOST || 'localhost';
        const port = connection.options?.port || process.env.REDIS_PORT || 6379;
        logger.info('Redis connected successfully', {
            host,
            port,
            usingUrl: !!process.env.REDIS_URL,
            usingTls: !!connection.options?.tls,
        });
    });

    connection.on('ready', () => {
        logger.info('Redis connection ready and authenticated');
    });

    connection.on('close', () => {
        logger.warn('Redis connection closed');
    });

    connection.on('reconnecting', delay => {
        logger.info('Redis reconnecting', { delay });
    });

    connection.on('end', () => {
        logger.warn('Redis connection ended');
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
