/**
 * Admin Metrics Route — GET /api/admin/metrics
 *
 * Returns latest health metrics and optional history.
 * Auth: ADMIN_PURGE_KEY header check.
 * Reference: docs/PERSONALIZATION_MODEL.md §11
 */

import { createAdminClient, verifyAdmin } from '../lib/auth.js';

export async function getMetricsHandler(req, res) {
  try {
    if (!verifyAdmin(req, res)) return;

    const supabase = createAdminClient();
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // Get latest metrics per metric_name
    const { data: latest } = await supabase
      .from('metrics_log')
      .select('*')
      .gte('computed_at', since)
      .order('computed_at', { ascending: false });

    // Group by metric_name, take latest of each
    const latestByName = {};
    const history = {};

    for (const row of (latest || [])) {
      if (!latestByName[row.metric_name]) {
        latestByName[row.metric_name] = row;
      }
      if (!history[row.metric_name]) {
        history[row.metric_name] = [];
      }
      history[row.metric_name].push({
        value: row.metric_value,
        target: row.target_value,
        passed: row.passed,
        at: row.computed_at,
      });
    }

    return res.json({
      current: Object.values(latestByName),
      history,
    });
  } catch (err) {
    console.error('[adminMetrics] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
