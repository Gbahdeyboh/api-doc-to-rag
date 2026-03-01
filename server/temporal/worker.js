import { Worker } from '@temporalio/worker';
import { fileURLToPath } from 'url';
import path from 'path';
import { startBrowserActivity } from './activities/start-browser.activity.js';
import { computerUseInitialRequestActivity } from './activities/computer-use-initial-request.activity.js';
import { executeBrowserActionActivity } from './activities/execute-browser-action.activity.js';
import { computerUseFeedbackActivity } from './activities/computer-use-feedback.activity.js';
import { extractCurlDocsActivity } from './activities/extract-curl-docs.activity.js';
import { closeBrowserActivity } from './activities/close-browser.activity.js';
import { createResourcesActivity } from './activities/create-resources.activity.js';
import { generateEmbeddingsActivity } from './activities/generate-embeddings.activity.js';
import { searchDocumentationActivity } from './activities/search-documentation.activity.js';
import { generateChatResponseActivity } from './activities/generate-chat-response.activity.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createTemporalWorker = async () => {
    const worker = await Worker.create({
        workflowsPath: path.join(__dirname, './workflows/index.js'),
        activities: {
            startBrowserActivity,
            computerUseInitialRequestActivity,
            executeBrowserActionActivity,
            computerUseFeedbackActivity,
            extractCurlDocsActivity,
            closeBrowserActivity,
            createResourcesActivity,
            generateEmbeddingsActivity,
            searchDocumentationActivity,
            generateChatResponseActivity,
        },
        taskQueue: 'documentation-crawl',
    });

    logger.info('Temporal worker created', { taskQueue: 'documentation-crawl' });
    return worker;
};
