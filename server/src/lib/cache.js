export function createTtlCache(defaultTtlMs = 60000, maxEntries = 10000) {
  const store = new Map();

  // Periodic cleanup of expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, Math.max(defaultTtlMs, 30000)).unref();

  const get = (key) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key, value, ttlMs = defaultTtlMs) => {
    // Evict oldest entries if cache is full
    if (store.size >= maxEntries) {
      const firstKey = store.keys().next().value;
      store.delete(firstKey);
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  };

  const del = (key) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  return { get, set, del, clear };
}
