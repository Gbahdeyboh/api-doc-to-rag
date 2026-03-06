import { condition, proxyActivities, setHandler } from '@temporalio/workflow';

/**
 * Long-lived chat session workflow.
 *
 * - Started once per conversation (per URL).
 * - Each user message is handled via an Update (`sendMessage`) which runs activities.
 * - Maintains conversation continuity via `previousResponseId` stored in workflow state.
 */
export async function chatWorkflow(url) {
    const { searchDocumentationActivity } = proxyActivities({
        startToCloseTimeout: '1 minute',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const { generateChatResponseActivity } = proxyActivities({
        startToCloseTimeout: '2 minutes',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    let previousResponseId = null;

    setHandler('sendMessage', async message => {
        const relevantChunks = await searchDocumentationActivity(message, url);
        const result = await generateChatResponseActivity(message, relevantChunks, previousResponseId);

        // Preserve continuity (Responses API). If no responseId is returned, keep the previous one.
        if (result?.responseId) {
            previousResponseId = result.responseId;
        }

        return result;
    });

    // Keep the workflow alive; it will serve updates as messages arrive.
    // (We can add a "close" signal/update later if we want explicit shutdown.)
    await condition(() => false);
}
