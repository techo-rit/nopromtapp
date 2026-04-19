import { createTtlCache } from './cache.js';

export const feedCache = createTtlCache(60 * 1000); // 60s per-user cache
