import { getSession } from '../browser-sessions.js';
import { handleBrowserAction } from '../../browser/index.js';
import { progressEmitter } from '../../utils/progress-emitter.js';
import { logger } from '../../utils/logger.js';

const takeScreenshot = async page => {
    const maxWidth = Math.min(1280, parseInt(process.env.DISPLAY_WIDTH));
    const maxHeight = Math.min(800, parseInt(process.env.DISPLAY_HEIGHT));
    const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 60,
        clip: { x: 0, y: 0, width: maxWidth, height: maxHeight },
    });
    return screenshot.toString('base64');
};

const getDelayForAction = action => {
    switch (action.action) {
        case 'mouse_move':
        case 'screenshot':
            return 100;
        case 'key':
        case 'type':
            return 200;
        case 'scroll':
            return 250;
        case 'click':
            return 400;
        default:
            return 300;
    }
};

export async function executeBrowserActionActivity(browserId, action, sessionId) {
    const { page } = getSession(browserId);

    logger.debug('Executing browser action', { action: action.action });

    if (sessionId) {
        progressEmitter.sendAction(sessionId, action.action, { details: action });
    }

    await handleBrowserAction(page, action);
    const delay = getDelayForAction(action);
    await new Promise(resolve => setTimeout(resolve, delay));

    const screenshotBase64 = await takeScreenshot(page);

    if (sessionId) {
        progressEmitter.sendScreenshot(sessionId, screenshotBase64);
    }

    return { screenshotBase64 };
}
