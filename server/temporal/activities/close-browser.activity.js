import { getSession, deleteSession } from '../browser-sessions.js';
import { logger } from '../../utils/logger.js';

export async function closeBrowserActivity(browserId) {
    const session = getSession(browserId);
    if (!session) {
        logger.warn('Browser session not found for closure', { browserId });
        return;
    }

    await session.browser
        .close()
        .catch(err => logger.error('Failed to close browser', { error: err.message }));

    deleteSession(browserId);
    logger.info('Browser closed', { browserId });
}
