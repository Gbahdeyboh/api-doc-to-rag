/**
 * Diagnostic script to test Redis connection
 * Run with: node server/queue/test-redis-connection.js
 */
import '../env.mjs';
import { getRedisConnection } from './redis-connection.js';
import { logger } from '../utils/logger.js';

async function testConnection() {
    logger.info('=== Redis Connection Diagnostic ===');
    logger.info('Environment variables:', {
        hasRedisUrl: !!process.env.REDIS_URL,
        hasRedisHost: !!process.env.REDIS_HOST,
        hasRedisPort: !!process.env.REDIS_PORT,
        redisUrlMasked: process.env.REDIS_URL
            ? process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@')
            : 'not set',
        redisHost: process.env.REDIS_HOST || 'not set',
        redisPort: process.env.REDIS_PORT || 'not set',
    });

    try {
        logger.info('Attempting to get Redis connection...');
        const connection = getRedisConnection();

        logger.info('Connection object created, waiting for connection...');

        // Wait for connection with timeout
        const connectionPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout after 10 seconds'));
            }, 10000);

            connection.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });

            connection.once('error', error => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        await connectionPromise;
        logger.info('✅ Connection established successfully!');

        // Test basic Redis commands
        logger.info('Testing Redis commands...');
        const pingResult = await connection.ping();
        logger.info('✅ PING result:', pingResult);

        const info = await connection.info('server');
        logger.info('✅ Redis server info retrieved (length:', info.length, 'bytes)');

        // Test queue operations
        logger.info('Testing queue operations...');
        const testKey = 'test:connection';
        await connection.set(testKey, 'test-value', 'EX', 10);
        const value = await connection.get(testKey);
        logger.info('✅ SET/GET test:', value === 'test-value' ? 'PASSED' : 'FAILED');
        await connection.del(testKey);

        logger.info('=== All tests passed! ===');
        logger.info('Redis connection is working correctly.');

        await connection.quit();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Connection test failed:', {
            error: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            address: error.address,
            port: error.port,
            stack: error.stack,
        });

        logger.info('\n=== Troubleshooting Tips ===');
        logger.info('1. Check if REDIS_URL is correct');
        logger.info('2. Verify Railway Redis is accessible from your network');
        logger.info('3. Check if TLS is required (Railway Redis may need rediss://)');
        logger.info('4. Ensure firewall allows connections on Redis port');
        logger.info('5. Check Railway Redis service is running');

        process.exit(1);
    }
}

testConnection();
