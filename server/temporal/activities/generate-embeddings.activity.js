import { generateEmbeddings } from '../../services/embeddings.js';
import { embeddings as embeddingsTable } from '../../db/schema/embeddings.js';
import { db } from '../../db/index.js';
import { logger } from '../../utils/logger.js';

export async function generateEmbeddingsActivity(resourceId, content) {
    const embeddings = await generateEmbeddings(content);

    if (embeddings.length > 0) {
        await db.insert(embeddingsTable).values(
            embeddings.map(embedding => ({
                resourceId,
                ...embedding,
            }))
        );
    }

    logger.info('Embeddings generated', { resourceId, embeddingsCount: embeddings.length });
    return { success: true, resourceId, embeddingsCount: embeddings.length };
}
