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

// Module-level cache so re-mounts don't re-fetch
let _cachedTemplates: Template[] | null = null;
let _cachedTrending: Template[] | null = null;
let _fetchPromise: Promise<void> | null = null;

function doFetch(): Promise<void> {
  if (!_fetchPromise) {
    _fetchPromise = Promise.all([
      fetchTemplates(),
      fetchTrendingTemplates(),
    ]).then(([all, trending]) => {
      _cachedTemplates = all;
      _cachedTrending = trending;
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
    if (_cachedTemplates && _cachedTrending) {
      applyCache();
      return;
    }

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
      if (!acc.has(t.stackId)) acc.set(t.stackId, []);
      acc.get(t.stackId)!.push(t);
      return acc;
    }, new Map<string, Template[]>()),
    [templates]
  );

  return { templates, templatesByID, templatesByStack, trendingTemplates, isLoading, error };
}
