import curlDocsGenerator from '../../agents/curl.js';
import { logger } from '../../utils/logger.js';

export async function extractCurlDocsActivity(screenshotBase64, previousResponseId) {
    const screenshotUrl = `data:image/jpeg;base64,${screenshotBase64}`;
    const curlResult = await curlDocsGenerator(screenshotUrl, previousResponseId);

    const curlDocs = curlResult.curlObj?.curlDocs || [];
    if (curlDocs.length > 0) {
        logger.info(`Extracted ${curlDocs.length} curl docs from screenshot`);
    }

    return { curlDocs, responseId: curlResult.responseId };
}
