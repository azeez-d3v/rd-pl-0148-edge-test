// Staging edge worker. Sits in front of the title service, caches reads,
// and exposes a purge route the deploy job calls after a publish.
import { cacheKey, purgeKeys } from "./keys.mjs";

const ORIGIN = "https://staging.internal";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "PURGE") {
      const keys = purgeKeys(request);
      await Promise.all(keys.map((k) => env.EDGE_CACHE.delete(k)));
      return new Response(`purged ${keys.length}`, { status: 200 });
    }

    const key = cacheKey(request);
    const hit = await env.EDGE_CACHE.get(key);
    if (hit) {
      return new Response(hit.body, {
        status: hit.status,
        headers: { "x-edge-cache": "hit", "content-type": hit.contentType },
      });
    }

    const res = await fetch(ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    });

    if (res.ok) {
      const body = await res.clone().text();
      const record = {
        body,
        status: res.status,
        contentType: res.headers.get("content-type") || "application/octet-stream",
      };
      ctx.waitUntil(env.EDGE_CACHE.put(key, record));
    }

    return new Response(res.body, {
      status: res.status,
      headers: { "x-edge-cache": "miss", "content-type": res.headers.get("content-type") || "text/plain" },
    });
  },
};
