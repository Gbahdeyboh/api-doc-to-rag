import { getSession } from '../browser-sessions.js';
import { openAIRequest } from '../../services/openai.js';
import prompts from '../../constants/prompt.js';
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

export async function computerUseInitialRequestActivity(browserId, sessionId) {
    const { page } = getSession(browserId);

    const screenshotBase64 = await takeScreenshot(page);

    const tools = [
        {
            type: 'computer_use_preview',
            display_width: parseInt(process.env.DISPLAY_WIDTH),
            display_height: parseInt(process.env.DISPLAY_HEIGHT),
            environment: 'browser',
        },
    ];

    const input = [
        {
            role: 'user',
            content: [
                { type: 'input_text', text: prompts.browser_use_prompt },
                { type: 'input_image', image_url: `data:image/jpeg;base64,${screenshotBase64}` },
            ],
        },
    ];

    const response = await openAIRequest('computer-use-preview', tools, input);

    const reasonings = response.output.filter(item => item.type === 'reasoning');
    reasonings.forEach(reasoning => {
        logger.info('AI Agent Reasoning', { summary: reasoning.summary });
        if (sessionId) {
            progressEmitter.sendReasoning(sessionId, reasoning.summary);
        }
    });

    const computerCalls = response.output.filter(item => item.type === 'computer_call');
    if (computerCalls.length === 0) {
        return { responseId: response.id, isDone: true, action: null, callId: null, safetyChecks: [] };
    }

    const computerCall = computerCalls[0];
    const safetyChecks = computerCalls
        .filter(item => item.pending_safety_checks)
        .flatMap(item => item.pending_safety_checks);

    return {
        responseId: response.id,
        action: computerCall.action,
        callId: computerCall.call_id,
        isDone: false,
        safetyChecks,
    };
}
