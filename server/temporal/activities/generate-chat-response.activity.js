import { openAIRequest } from '../../services/openai.js';
import prompts from '../../constants/prompt.js';
import { logger } from '../../utils/logger.js';

export async function generateChatResponseActivity(message, relevantChunks, previousResponseId) {
    if (!relevantChunks || relevantChunks.length === 0) {
        return {
            response:
                "I don't have any documentation available yet. Please wait for the scraping to complete or try a different question.",
            responseId: null,
            sources: [],
        };
    }

    const context = relevantChunks
        .map((result, idx) => {
            const parts = [];
            if (result.tags) parts.push(`Tags: ${result.tags}`);
            if (result.description) parts.push(`Description: ${result.description}`);
            if (result.curlCommand) parts.push(`cURL: ${result.curlCommand}`);
            if (result.content) parts.push(`Content: ${result.content}`);
            return `[Source ${idx + 1}]\n${parts.join('\n')}`;
        })
        .join('\n\n');

    const messages = [];
    if (!previousResponseId) {
        messages.push({ role: 'system', content: prompts.chat_rag_prompt(context) });
    }
    messages.push({ role: 'user', content: message });

    const response = await openAIRequest('gpt-4o-mini', [], messages, null, undefined, previousResponseId);

    const textOutput = response.output_text;

    logger.info('Chat response generated', {
        messageLength: message.length,
        responseLength: textOutput?.length,
        sourcesCount: relevantChunks.length,
        responseId: response.id,
        hasPreviousContext: !!previousResponseId,
    });

    return {
        response: textOutput,
        responseId: response.id,
        sources: relevantChunks.map(r => ({
            tags: r.tags,
            description: r.description?.substring(0, 100),
        })),
    };
}
