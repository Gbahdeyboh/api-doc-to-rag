import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger.js';
import { getRedisConnection, closeRedisConnection } from './redis-connection.js';

// Get centralized Redis connection
const connection = getRedisConnection();

// Queue for curl generation
export const curlQueue = new Queue('curl-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
        },
    },
});

// QueueEvents for listening to job completion
export const curlQueueEvents = new QueueEvents('curl-generation', { connection });

// Increase max listeners to prevent memory leak warnings when waiting for many jobs
curlQueueEvents.setMaxListeners(0);

// Queue for embeddings generation
export const embeddingsQueue = new Queue('embeddings-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
        },
    },
});

// QueueEvents for listening to embeddings job completion
export const embeddingsQueueEvents = new QueueEvents('embeddings-generation', { connection });

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing queues...');
    await curlQueue.close();
    await curlQueueEvents.close();
    await embeddingsQueue.close();
    await embeddingsQueueEvents.close();
    await closeRedisConnection();
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing queues...');
    await curlQueue.close();
    await curlQueueEvents.close();
    await embeddingsQueue.close();
    await embeddingsQueueEvents.close();
    await closeRedisConnection();
    process.exit(0);
});

logger.info('Queues initialized', {
    curlQueue: curlQueue.name,
    embeddingsQueue: embeddingsQueue.name,
});
