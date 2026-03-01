import { Client, Connection } from '@temporalio/client';
import { logger } from '../utils/logger.js';

let client;

export const getTemporalClient = async () => {
    if (!client) {
        const connection = await Connection.connect({ address: 'localhost:7233' });
        client = new Client({ connection });
        logger.info('Temporal client connected', { address: 'localhost:7233' });
    }
    return client;
};
