import { nanoid } from 'nanoid';
import { startBrowser } from '../../browser/index.js';
import { progressEmitter } from '../../utils/progress-emitter.js';
import { createSession } from '../browser-sessions.js';
import { logger } from '../../utils/logger.js';

export async function startBrowserActivity(url, sessionId) {
    const { browser, page } = await startBrowser(url);
    const browserId = nanoid();

    createSession(browserId, browser, page);

    if (sessionId) {
        progressEmitter.sendEvent(sessionId, 'browser_started', { url });
    }

    logger.info('Browser started', { browserId, url });
    return browserId;
}
