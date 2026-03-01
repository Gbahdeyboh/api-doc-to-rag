import { findRelevantContent } from '../../actions/search.js';
import { logger } from '../../utils/logger.js';

export async function searchDocumentationActivity(query, url) {
    logger.info('Searching documentation', { query, url });
    const results = await findRelevantContent(query, url);
    return results;
}
