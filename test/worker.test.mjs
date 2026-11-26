import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.ts";

class EdgeCache {
  records = new Map();

  async get(key) {
    return this.records.get(key);
  }

  async put(key, value) {
    this.records.set(key, value);
  }

  async delete(key) {
    this.records.delete(key);
  }
}

test("a POST reaches the origin after the same path was cached by GET", async () => {
  const originalFetch = globalThis.fetch;
  const originRequests = [];
  globalThis.fetch = async (url, init) => {
    originRequests.push({ url, method: init.method });
    return new Response(`${init.method} origin response`, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  };

  const env = { EDGE_CACHE: new EdgeCache() };
  const pending = [];
  const ctx = { waitUntil: (promise) => pending.push(promise) };

  try {
    const getResponse = await worker.fetch(
      new Request("https://edge.staging/titles/8812"),
      env,
      ctx,
    );
    assert.equal(await getResponse.text(), "GET origin response");
    await Promise.all(pending.splice(0));

    const postResponse = await worker.fetch(
      new Request("https://edge.staging/titles/8812", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"title":"New title"}',
      }),
      env,
      ctx,
    );

    assert.equal(await postResponse.text(), "POST origin response");
    assert.equal(postResponse.headers.get("x-edge-cache"), "miss");
    assert.deepEqual(originRequests, [
      { url: "https://staging.internal/titles/8812", method: "GET" },
      { url: "https://staging.internal/titles/8812", method: "POST" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
