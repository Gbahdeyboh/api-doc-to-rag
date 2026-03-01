import { proxyActivities } from '@temporalio/workflow';

export async function chatWorkflow(message, url, previousResponseId) {
    const { searchDocumentationActivity } = proxyActivities({
        startToCloseTimeout: '1 minute',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const { generateChatResponseActivity } = proxyActivities({
        startToCloseTimeout: '2 minutes',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const relevantChunks = await searchDocumentationActivity(message, url);
    return await generateChatResponseActivity(message, relevantChunks, previousResponseId);
}
