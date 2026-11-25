// Cache key for the staging edge.
// Everything the response varies on has to be in here.
export function cacheKey(request) {
  const u = new URL(request.url);
  return `edge:${u.pathname}`;
}

// Keys that a write to this path has to invalidate.
export function purgeKeys(request) {
  return [cacheKey(request)];
}

export function normalizeContentType(ct) {
  return (ct || "").split(";")[0].trim().toLowerCase();
}
