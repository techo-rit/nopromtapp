export function createTtlCache(defaultTtlMs = 60000) {
  const store = new Map();

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
