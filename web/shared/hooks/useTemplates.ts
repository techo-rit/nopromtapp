// web/shared/hooks/useTemplates.ts — Single source of truth for template data
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTemplates, fetchTrendingTemplates } from '../../features/templates/templateService';
import { CONFIG } from '../../config';
import type { Template } from '../../types';

interface UseTemplatesResult {
  templates: Template[];
  templatesByID: Map<string, Template>;
  templatesByStack: Map<string, Template[]>;
  trendingTemplates: Template[];
  isLoading: boolean;
  error: string | null;
}

// Module-level cache so re-mounts don't re-fetch (60s TTL)
const CACHE_TTL = 60_000;
let _cachedTemplates: Template[] | null = null;
let _cachedTrending: Template[] | null = null;
let _fetchPromise: Promise<void> | null = null;
let _cacheTime = 0;

function isCacheValid(): boolean {
  return _cachedTemplates !== null && _cachedTrending !== null && (Date.now() - _cacheTime) < CACHE_TTL;
}

function doFetch(): Promise<void> {
  if (!_fetchPromise) {
    _fetchPromise = Promise.all([
      fetchTemplates(),
      fetchTrendingTemplates(),
    ]).then(([all, trending]) => {
      _cachedTemplates = all;
      _cachedTrending = trending;
      _cacheTime = Date.now();
      _fetchPromise = null;
    }).catch((err) => {
      _fetchPromise = null;
      throw err;
    });
  }
  return _fetchPromise;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<Template[]>(_cachedTemplates || []);
  const [trendingTemplates, setTrendingTemplates] = useState<Template[]>(_cachedTrending || []);
  const [isLoading, setIsLoading] = useState(!_cachedTemplates);
  const [error, setError] = useState<string | null>(null);

  const applyCache = useCallback(() => {
    setTemplates(_cachedTemplates || []);
    setTrendingTemplates(_cachedTrending || []);
    setIsLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (isCacheValid()) {
      applyCache();
      return;
    }

    // Cache expired or empty — force re-fetch
    _cachedTemplates = null;
    _cachedTrending = null;
    _fetchPromise = null;

    let mounted = true;
    doFetch()
      .then(() => { if (mounted) applyCache(); })
      .catch((err) => { if (mounted) { setError(err.message); setIsLoading(false); } });

    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE: listen for real-time template updates from server
  useEffect(() => {
    const url = `${CONFIG.API.BASE_URL}/api/templates/stream`;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url);
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'update') {
            // Invalidate cache and re-fetch
            _cachedTemplates = null;
            _cachedTrending = null;
            _fetchPromise = null;
            _cacheTime = 0;
            doFetch()
              .then(() => {
                setTemplates(_cachedTemplates || []);
                setTrendingTemplates(_cachedTrending || []);
              })
              .catch(() => { /* silent — old data still shown */ });
          }
        } catch { /* ignore non-JSON heartbeats */ }
      };
      es.onerror = () => {
        es?.close();
        // Reconnect after 5s
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const templatesByID = useMemo(
    () => new Map(templates.map(t => [t.id, t])),
    [templates]
  );

  const templatesByStack = useMemo(
    () => templates.reduce((acc, t) => {
      // Derive stack from template ID prefix (e.g. 'aesthetics_template_9' → 'aesthetics')
      const stack = t.stackId || t.id.split('_')[0] || 'other';
      if (!acc.has(stack)) acc.set(stack, []);
      acc.get(stack)!.push(t);
      return acc;
    }, new Map<string, Template[]>()),
    [templates]
  );

  return { templates, templatesByID, templatesByStack, trendingTemplates, isLoading, error };
}
