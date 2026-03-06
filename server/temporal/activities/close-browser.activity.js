import { getSession, deleteSession } from '../browser-sessions.js';
import { logger } from '../../utils/logger.js';

export async function closeBrowserActivity(browserId) {
    const session = getSession(browserId);
    if (!session) {
        // Session already closed or doesn't exist - this is fine, just log and return
        logger.debug('Browser session not found for closure (may have been already closed)', { browserId });
        return;
    }

    try {
        // Check if browser is still connected before closing
        if (session.browser && session.browser.isConnected()) {
            await session.browser.close();
            logger.info('Browser closed successfully', { browserId });
        } else {
            logger.warn('Browser already disconnected', { browserId });
        }
    } catch (err) {
        logger.error('Failed to close browser', { browserId, error: err.message });
        // Don't throw - we still want to clean up the session
    } finally {
        // Always delete the session from our map, even if closing failed
        // This makes the operation idempotent - safe to call multiple times
        deleteSession(browserId);
    }
}
