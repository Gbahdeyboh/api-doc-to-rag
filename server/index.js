import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';
import { findRelevantContent } from './actions/search.js';
import { generateCollection } from './actions/postman.js';
import { isValidUrl } from './utils/utils.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js';
import { ValidationError } from './utils/errors.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection } from './db/index.js';
import { progressEmitter } from './utils/progress-emitter.js';
import { createTemporalWorker } from './temporal/worker.js';
import { getTemporalClient } from './temporal/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load .env from root directory
const envPath = path.join(rootDir, '.env');
console.log('Loading .env from:', envPath);
config({ path: envPath, debug: true });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin:
        process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') || [] : '*',
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(rootDir, 'dist')));
}

app.get(
    '/health',
    asyncHandler(async (req, res) => {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        };

        try {
            await checkDatabaseConnection();
            health.database = 'connected';
        } catch (error) {
            health.database = 'disconnected';
            health.status = 'degraded';
            logger.warn('Health check: database disconnected', { error: error.message });
        }

        const statusCode = health.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(health);
    })
);

// use agent to generate knowledge base from a documentation URL
app.post(
    '/knowledge-base',
    asyncHandler(async (req, res) => {
        const { url } = req.body;

        if (!url) {
            throw new ValidationError('URL is required in the request body');
        }

        if (!isValidUrl(url)) {
            throw new ValidationError('Invalid URL format. Please provide a valid URL');
        }

        logger.info('Starting knowledge base generation', { url });

        const client = await getTemporalClient();
        const handle = await client.workflow.start('documentationCrawlWorkflow', {
            args: [url, null],
            taskQueue: 'documentation-crawl',
            workflowId: `crawl-${Date.now()}`,
        });
        const result = await handle.result();

        res.json({ url, data: result });
    })
);

// SSE-enabled endpoint for real-time progress updates
app.get(
    '/knowledge-base/stream',
    asyncHandler(async (req, res) => {
        const { url } = req.query;

        console.log('url', url);

        if (!url) {
            throw new ValidationError('URL is required as a query parameter');
        }

        if (!isValidUrl(url)) {
            throw new ValidationError('Invalid URL format. Please provide a valid URL');
        }

        // Generate unique session ID
        const sessionId = nanoid();

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Register SSE session
        progressEmitter.registerSession(sessionId, res);

        logger.info('Starting knowledge base generation with SSE', { url, sessionId });

        // Send initial event
        progressEmitter.sendEvent(sessionId, 'started', { url }, 0);

        try {
            const client = await getTemporalClient();
            const handle = await client.workflow.start('documentationCrawlWorkflow', {
                args: [url, sessionId],
                taskQueue: 'documentation-crawl',
                workflowId: `crawl-${sessionId}`,
            });
            await handle.result();

            // Generate Postman collection automatically
            logger.info('Auto-generating Postman collection', { url, sessionId });
            progressEmitter.sendEvent(sessionId, 'collection_generation_started', {
                message: 'Generating Postman collection...',
            });

            const { collection } = await generateCollection(url, false);

            progressEmitter.sendCollection(sessionId, { collection });

            progressEmitter.sendComplete(sessionId, {
                url,
                message: 'Documentation generation and collection creation completed successfully!',
            });
        } catch (error) {
            logger.error('Knowledge base generation failed', {
                url,
                sessionId,
                error: error.message,
            });
            progressEmitter.sendError(sessionId, error);
        }

        // Handle client disconnect
        req.on('close', () => {
            if (progressEmitter.hasSession(sessionId)) {
                logger.info('Client disconnected from SSE', { sessionId });
                progressEmitter.unregisterSession(sessionId);
            }
        });
    })
);

// search the knowledge base for relevant content
app.get(
    '/documentation/search',
    asyncHandler(async (req, res) => {
        const { query, url } = req.query;

        if (!query) {
            throw new ValidationError('Query parameter is required (e.g., ?query=your search)');
        }

        logger.info('Searching documentation', { query, url });

        // Do a similarity search to find relevant content
        const results = await findRelevantContent(query, url);

        res.json({
            query,
            url,
            results,
        });
    })
);

// Generate Postman collection from the knowledge base
app.get(
    '/documentation/postman',
    asyncHandler(async (req, res) => {
        const { url, useAI } = req.query;

        if (!url) {
            throw new ValidationError('URL parameter is required (e.g., ?url=https://example.com)');
        }

        if (!isValidUrl(url)) {
            throw new ValidationError('Invalid URL format. Please provide a valid URL');
        }

        // Parse useAI parameter (default to false)
        const shouldUseAI = useAI === 'true';

        logger.info('Generating Postman collection', { url, useAI: shouldUseAI });

        const { collection, resourceCount, conversionReport } = await generateCollection(
            url,
            shouldUseAI
        );

        res.json({
            collection,
            resourceCount,
            conversionReport: {
                total: conversionReport.total,
                successful: conversionReport.successful,
                duplicates: conversionReport.duplicates,
                failed: conversionReport.failed,
                errors: conversionReport.errors,
                generatedBy: conversionReport.generatedBy,
            },
        });
    })
);

// Chat with documentation using RAG
app.post(
    '/documentation/chat',
    asyncHandler(async (req, res) => {
        const { url, message, conversationId } = req.body;

        if (!url) {
            throw new ValidationError('URL is required in the request body');
        }

        if (!message) {
            throw new ValidationError('Message is required in the request body');
        }

        if (!isValidUrl(url)) {
            throw new ValidationError('Invalid URL format. Please provide a valid URL');
        }

        logger.info('Chat request', { url, message, hasConversationId: !!conversationId });

        const client = await getTemporalClient();
        let handle;
        let workflowId = conversationId;

        if (!workflowId) {
            workflowId = `chat-${nanoid()}`;
            handle = await client.workflow.start('chatWorkflow', {
                args: [url],
                taskQueue: 'documentation-crawl',
                workflowId,
            });
        } else {
            handle = client.workflow.getHandle(workflowId);
        }

        // Route each message as an update on the same workflow (same conversation).
        const result = await handle.executeUpdate('sendMessage', {
            args: [message],
        });

        res.json({ ...result, conversationId: workflowId });
    })
);

if (process.env.NODE_ENV === 'production') {
    // Catch-all middleware for SPA - must be last before 404 handler
    // Use middleware instead of route pattern to avoid Express 5 path-to-regexp issues
    app.use((req, res, next) => {
        // Skip API routes and let them 404 properly
        if (
            req.path.startsWith('/api/') ||
            req.path.startsWith('/knowledge-base/') ||
            req.path.startsWith('/documentation/') ||
            req.path.startsWith('/admin/')
        ) {
            return next();
        }
        // Skip if request is for a static file (has extension)
        if (path.extname(req.path)) {
            return next();
        }
        // Serve index.html for all other routes (SPA routing)
        res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
}

// Handle 404 errors (must come after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Check database connection before starting server
checkDatabaseConnection()
    .then(async () => {
        // Start Temporal worker (co-located with server so activities share progressEmitter)
        const worker = await createTemporalWorker();
        worker.run().catch(error => {
            logger.error('Temporal worker crashed', { error: error.message });
        });
        logger.info('Temporal worker running', { taskQueue: 'documentation-crawl' });

        // Start Express server
        app.listen(PORT, () => {
            logger.info(`Server listening on port ${PORT}`);
        });
    })
    .catch(error => {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    });

export default app;
