// Cache key for the staging edge.
// Everything the response varies on has to be in here.
const HEAD_AS_GET = { HEAD: "GET" };

function methodOf(request) {
  return HEAD_AS_GET[request.method] || request.method;
}

export function cacheKey(request) {
  const u = new URL(request.url);
  const ct = normalizeContentType(request.headers.get("content-type")) || "-";
  return `edge:${methodOf(request)}:${u.pathname}${u.search}:${ct}`;
}

// Variants this edge stores. A purge has to take the same keys a write could
// have used, or the invalidation lands beside the entry instead of on it.
const PURGE_METHODS = ["GET", "POST"];
const PURGE_CONTENT_TYPES = ["-", "application/json", "application/x-www-form-urlencoded", "text/plain",
  "multipart/form-data"];

export function purgeKeys(request) {
  const u = new URL(request.url);
  const keys = [];
  for (const m of PURGE_METHODS) {
    for (const ct of PURGE_CONTENT_TYPES) {
      keys.push(`edge:${m}:${u.pathname}${u.search}:${ct}`);
    }
  }
  return keys;
}

export function normalizeContentType(ct) {
  return (ct || "").split(";")[0].trim().toLowerCase();
}
