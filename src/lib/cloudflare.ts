/**
 * Cloudflare API integration
 * CLOUDFLARE_API_TOKEN  — https://dash.cloudflare.com/profile/api-tokens
 * CLOUDFLARE_ACCOUNT_ID — Dashboard → right sidebar
 * CLOUDFLARE_ZONE_ID    — (ixtiyoriy, DNS/cache uchun)
 */

const BASE = "https://api.cloudflare.com/client/v4";

function headers() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN sozlanmagan");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function accountId() {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID sozlanmagan");
  return id;
}

export function cloudflareConfigured() {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

/** KV namespace ro'yxati */
export async function cfKvListNamespaces() {
  const res = await fetch(`${BASE}/accounts/${accountId()}/storage/kv/namespaces`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`CF KV list xatosi: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

/** KV dan qiymat o'qish */
export async function cfKvGet(namespaceId: string, key: string) {
  const res = await fetch(
    `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    { headers: headers() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CF KV get xatosi: ${res.status}`);
  return res.text();
}

/** KV ga qiymat yozish */
export async function cfKvPut(namespaceId: string, key: string, value: string, ttl?: number) {
  const url = `${BASE}/accounts/${accountId()}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}${ttl ? `?expiration_ttl=${ttl}` : ""}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "text/plain" },
    body: value,
  });
  if (!res.ok) throw new Error(`CF KV put xatosi: ${res.status}`);
  return res.json();
}

/** D1 database query */
export async function cfD1Query(databaseId: string, sql: string, params: unknown[] = []) {
  const res = await fetch(
    `${BASE}/accounts/${accountId()}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ sql, params }),
    }
  );
  if (!res.ok) throw new Error(`CF D1 query xatosi: ${res.status}`);
  const data = await res.json();
  return data.result?.[0]?.results || [];
}

/** R2 bucket ro'yxati */
export async function cfR2ListBuckets() {
  const res = await fetch(`${BASE}/accounts/${accountId()}/r2/buckets`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`CF R2 list xatosi: ${res.status}`);
  const data = await res.json();
  return data.result?.buckets || [];
}

/** Workers ro'yxati */
export async function cfWorkersList() {
  const res = await fetch(`${BASE}/accounts/${accountId()}/workers/scripts`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`CF Workers list xatosi: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

/** Cache purge (zone kerak) */
export async function cfPurgeCache(urls: string[]) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) throw new Error("CLOUDFLARE_ZONE_ID sozlanmagan");
  const res = await fetch(`${BASE}/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ files: urls }),
  });
  if (!res.ok) throw new Error(`CF purge cache xatosi: ${res.status}`);
  return res.json();
}
