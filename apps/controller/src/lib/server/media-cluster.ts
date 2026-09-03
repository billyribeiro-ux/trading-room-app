import { MEDIA_CLUSTER_HOSTS_JSON, STREAM_SERVER_MTX } from '$app/env/private';

export interface MediaClusterEndpoint {
  host: string;
  healthUrl: string | null;
}

export interface ResolvedMediaCluster {
  host: string;
  clusterId: string | null;
  usedBackup: boolean;
  configured: boolean;
}

const HEALTH_TIMEOUT_MS = 1_500;
const HEALTH_CACHE_MS = 10_000;
const healthCache = new Map<string, { healthy: boolean; checkedAt: number }>();

function validHost(value: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[0-9a-f:]+\])(?::\d{1,5})?$/i.test(value);
}

export function parseMediaClusterMap(raw: string | undefined): ReadonlyMap<string, MediaClusterEndpoint> {
  const result = new Map<string, MediaClusterEndpoint>();
  if (!raw?.trim()) return result;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[media-cluster] MEDIA_CLUSTER_HOSTS_JSON is not valid JSON');
    return result;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return result;
  for (const [clusterId, candidate] of Object.entries(parsed)) {
    const id = clusterId.trim();
    const host =
      typeof candidate === 'string'
        ? candidate.trim()
        : candidate &&
            typeof candidate === 'object' &&
            !Array.isArray(candidate) &&
            typeof (candidate as Record<string, unknown>).host === 'string'
          ? String((candidate as Record<string, unknown>).host).trim()
          : '';
    const health =
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      typeof (candidate as Record<string, unknown>).healthUrl === 'string'
        ? String((candidate as Record<string, unknown>).healthUrl).trim()
        : '';
    if (!id || !validHost(host)) {
      console.error('[media-cluster] ignored an invalid cluster endpoint', { clusterId: id });
      continue;
    }
    let healthUrl: string | null = null;
    if (health) {
      try {
        const url = new URL(health);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid');
        healthUrl = url.toString();
      } catch {
        console.error('[media-cluster] ignored an invalid health URL', { clusterId: id });
      }
    }
    result.set(id, { host, healthUrl });
  }
  return result;
}

async function healthy(endpoint: MediaClusterEndpoint): Promise<boolean> {
  if (!endpoint.healthUrl) return true;
  const now = Date.now();
  const cached = healthCache.get(endpoint.healthUrl);
  if (cached && now - cached.checkedAt < HEALTH_CACHE_MS) return cached.healthy;
  let result: boolean;
  try {
    const response = await fetch(endpoint.healthUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS)
    });
    result = response.status >= 200 && response.status < 500;
  } catch {
    result = false;
  }
  healthCache.set(endpoint.healthUrl, { healthy: result, checkedAt: now });
  return result;
}

/** Resolves a room's primary MediaMTX cluster and uses its same-account configured backup on failure. */
export async function resolveMediaCluster(settings: {
  clusterID?: unknown;
  backupClusterID?: unknown;
}): Promise<ResolvedMediaCluster> {
  const mapping = parseMediaClusterMap(MEDIA_CLUSTER_HOSTS_JSON);
  const primaryId = typeof settings.clusterID === 'string' ? settings.clusterID.trim() : '';
  const backupId = typeof settings.backupClusterID === 'string' ? settings.backupClusterID.trim() : '';
  const primary = primaryId ? mapping.get(primaryId) : undefined;
  const backup = backupId ? mapping.get(backupId) : undefined;

  if (primary) {
    if (await healthy(primary)) {
      return { host: primary.host, clusterId: primaryId, usedBackup: false, configured: true };
    }
    console.warn('[media-cluster] primary health check failed', { clusterId: primaryId });
    if (backup && (await healthy(backup))) {
      console.warn('[media-cluster] serving the configured backup', {
        primaryClusterId: primaryId,
        backupClusterId: backupId
      });
      return { host: backup.host, clusterId: backupId, usedBackup: true, configured: true };
    }
    return { host: '', clusterId: primaryId, usedBackup: false, configured: false };
  }

  const fallback = STREAM_SERVER_MTX?.trim() ?? '';
  if (primaryId && mapping.size > 0) {
    console.warn('[media-cluster] primary cluster has no endpoint mapping', { clusterId: primaryId });
  }
  return {
    host: fallback,
    clusterId: primaryId || null,
    usedBackup: false,
    configured: fallback !== ''
  };
}
