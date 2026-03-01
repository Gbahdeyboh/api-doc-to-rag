import { createResourcesWithoutEmbeddings } from '../../actions/resources.js';
import { logger } from '../../utils/logger.js';

export async function createResourcesActivity(curlDocs, url) {
    if (!curlDocs || curlDocs.length === 0) {
        return [];
    }

    const docsToEmbed = curlDocs.map(doc => ({
        content: [
            `Tags: ${doc.tags}`,
            `Description: ${doc.description}`,
            `Curl Command: ${doc.curl}`,
            `Parameters: ${(doc.parameters || [])
                .map(
                    p =>
                        `${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}`
                )
                .join('; ')}`,
        ]
            .filter(Boolean)
            .join('\n\n'),
        url,
        tags: doc.tags,
        description: doc.description,
        curlCommand: doc.curl,
        parameters: doc.parameters || [],
    }));

    const insertedResources = await createResourcesWithoutEmbeddings(docsToEmbed);

    logger.info(`Created ${insertedResources.length} resources`, { url });

    // Return id + content pairs needed for the embeddings activity
    return insertedResources.map((resource, idx) => ({
        id: resource.id,
        content: docsToEmbed[idx].content,
    }));
}
