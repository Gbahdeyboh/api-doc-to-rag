import { openAIRequest } from '../../services/openai.js';
import { progressEmitter } from '../../utils/progress-emitter.js';
import { logger } from '../../utils/logger.js';

export async function computerUseFeedbackActivity(
    screenshotBase64,
    callId,
    responseId,
    safetyChecks,
    sessionId
) {
    const screenshotUrl = `data:image/jpeg;base64,${screenshotBase64}`;

    const tools = [
        {
            type: 'computer_use_preview',
            display_width: parseInt(process.env.DISPLAY_WIDTH),
            display_height: parseInt(process.env.DISPLAY_HEIGHT),
            environment: 'browser',
        },
    ];

    const nextInput = [
        {
            call_id: callId,
            type: 'computer_call_output',
            output: { type: 'input_image', image_url: screenshotUrl },
        },
    ];

    if (safetyChecks && safetyChecks.length > 0) {
        logger.warn('Safety checks detected, acknowledging...', safetyChecks);
        nextInput[0].acknowledged_safety_checks = safetyChecks.map(sc => ({
            id: sc.id,
            code: sc.code,
            message: sc.message,
        }));
    }

    const response = await openAIRequest(
        'computer-use-preview',
        tools,
        nextInput,
        null,
        { summary: 'concise' },
        responseId
    );

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
    const newSafetyChecks = computerCalls
        .filter(item => item.pending_safety_checks)
        .flatMap(item => item.pending_safety_checks);

    return {
        responseId: response.id,
        action: computerCall.action,
        callId: computerCall.call_id,
        isDone: false,
        safetyChecks: newSafetyChecks,
    };
}
