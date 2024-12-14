import LRU from 'lru-cache';

export function rateLimit({ interval, uniqueTokenPerInterval = 500 }) {
    const tokenCache = new LRU({
        max: uniqueTokenPerInterval,
        ttl: interval
    });

    return {
        check: async (limit, token = 'GLOBAL') => {
            const tokenCount = (tokenCache.get(token) || 0) + 1;

            if (tokenCount > limit) {
                throw new Error('Rate limit exceeded');
            }

            tokenCache.set(token, tokenCount);
            return true;
        }
    };
}
