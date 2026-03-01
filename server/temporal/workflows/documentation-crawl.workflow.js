import { proxyActivities } from '@temporalio/workflow';

export async function documentationCrawlWorkflow(url, sessionId) {
    const { startBrowserActivity } = proxyActivities({
        startToCloseTimeout: '2 minutes',
        retry: { maximumAttempts: 1 },
    });

    const { computerUseInitialRequestActivity, computerUseFeedbackActivity } = proxyActivities({
        startToCloseTimeout: '3 minutes',
        retry: { maximumAttempts: 1 },
    });

    const { executeBrowserActionActivity } = proxyActivities({
        startToCloseTimeout: '1 minute',
        retry: { maximumAttempts: 1 },
    });

    const { extractCurlDocsActivity, createResourcesActivity } = proxyActivities({
        startToCloseTimeout: '2 minutes',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const { closeBrowserActivity } = proxyActivities({
        startToCloseTimeout: '30 seconds',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const { generateEmbeddingsActivity } = proxyActivities({
        startToCloseTimeout: '3 minutes',
        retry: { maximumAttempts: 3, backoffCoefficient: 2, initialInterval: '2s' },
    });

    const browserId = await startBrowserActivity(url, sessionId);

    let { responseId, action, callId, isDone, safetyChecks } =
        await computerUseInitialRequestActivity(browserId, sessionId);

    const allCurlDocs = [];
    let curlPreviousResponseId = null;

    try {
        while (!isDone) {
            const { screenshotBase64 } = await executeBrowserActionActivity(
                browserId,
                action,
                sessionId
            );

            // Run computer-use feedback and curl extraction concurrently — both only need the screenshot
            const [feedback, curlResult] = await Promise.all([
                computerUseFeedbackActivity(
                    screenshotBase64,
                    callId,
                    responseId,
                    safetyChecks,
                    sessionId
                ),
                extractCurlDocsActivity(screenshotBase64, curlPreviousResponseId),
            ]);

            curlPreviousResponseId = curlResult.responseId;
            if (curlResult.curlDocs?.length > 0) {
                allCurlDocs.push(...curlResult.curlDocs);
            }

            ({ responseId, action, callId, isDone, safetyChecks } = feedback);
        }
    } finally {
        await closeBrowserActivity(browserId);
    }

    if (allCurlDocs.length === 0) {
        return { success: true, resourceCount: 0 };
    }

    const resources = await createResourcesActivity(allCurlDocs, url);

    if (resources.length === 0) {
        return { success: true, resourceCount: 0 };
    }

    await Promise.all(
        resources.map(resource => generateEmbeddingsActivity(resource.id, resource.content))
    );

    return { success: true, resourceCount: resources.length };
}
