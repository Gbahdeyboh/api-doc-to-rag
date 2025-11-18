/**
 * Worker process that starts all BullMQ workers
 * Run this separately from the main server: node server/queue/start-workers.js
 */
import '../env.mjs'; // Load environment variables
import { logger } from '../utils/logger.js';

// Log environment info for debugging
logger.info('Worker process starting...', {
    nodeEnv: process.env.NODE_ENV,
    hasRedisUrl: !!process.env.REDIS_URL,
    hasRedisHost: !!process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT || '6379',
});

// Import workers (this will initialize Redis connections)
// Using dynamic import to catch any initialization errors
let curlWorker;
let embeddingsWorker;

try {
    const curlWorkerModule = await import('./workers/curl-worker.js');
    curlWorker = curlWorkerModule.default;

    const embeddingsWorkerModule = await import('./workers/embeddings-worker.js');
    embeddingsWorker = embeddingsWorkerModule.default;

    logger.info('All BullMQ workers imported successfully', {
        workers: ['curl-generation', 'embeddings-generation'],
    });
} catch (error) {
    logger.error('Failed to import workers', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
}

// Graceful shutdown
const shutdown = async signal => {
    logger.info(`${signal} received, shutting down workers...`);

    try {
        if (curlWorker) await curlWorker.close();
        if (embeddingsWorker) await embeddingsWorker.close();
        logger.info('All workers closed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error during worker shutdown', { error: error.message });
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', error => {
    logger.error('Uncaught exception in worker process', {
        error: error.message,
        stack: error.stack,
    });
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection in worker process', {
        reason: reason?.message || reason,
        promise,
    });
});

logger.info('All workers started and ready to process jobs');
