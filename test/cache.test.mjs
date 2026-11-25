import test from "node:test";
import assert from "node:assert/strict";
import { cacheKey, purgeKeys } from "../src/keys.mjs";

const req = (method, path, ct) =>
  new Request("https://edge.staging" + path, {
    method,
    headers: ct ? { "content-type": ct } : {},
    body: method === "GET" ? undefined : "{}",
  });

// A tiny stand-in for the edge cache so the behaviour can be checked without
// the Workers runtime.
class Store {
  constructor() {
    this.m = new Map();
  }
  get(k) {
    return this.m.get(k);
  }
  put(k, v) {
    this.m.set(k, v);
  }
  delete(k) {
    this.m.delete(k);
  }
  size() {
    return this.m.size;
  }
}

// The fault: a POST to a path that has been read returns the cached GET body.
test("a POST does not read the cached GET body", () => {
  const store = new Store();
  store.put(cacheKey(req("GET", "/titles/8812")), { body: "cached read" });

  const key = cacheKey(req("POST", "/titles/8812"));
  assert.equal(store.get(key), undefined, "POST hit the GET entry");
});

test("GET and POST of the same path get different keys", () => {
  assert.notEqual(cacheKey(req("GET", "/titles/8812")), cacheKey(req("POST", "/titles/8812")));
});

test("content type is part of the key", () => {
  const json = cacheKey(req("POST", "/titles/8812", "application/json; charset=utf-8"));
  const form = cacheKey(req("POST", "/titles/8812", "application/x-www-form-urlencoded"));
  assert.notEqual(json, form);
  assert.equal(json, cacheKey(req("POST", "/titles/8812", "application/json")));
});

test("a purge takes the same key the write used", () => {
  const store = new Store();
  const getKey = cacheKey(req("GET", "/titles/8812"));
  const postKey = cacheKey(req("POST", "/titles/8812"));
  store.put(getKey, { body: "cached read" });
  store.put(postKey, { body: "your write" });

  for (const k of purgeKeys(req("PURGE", "/titles/8812"))) store.delete(k);

  assert.equal(store.get(getKey), undefined, "GET entry survived the purge");
  assert.equal(store.get(postKey), undefined, "POST entry survived the purge");
});

test("the key covers the query string, not just the path", () => {
  assert.notEqual(cacheKey(req("GET", "/titles?page=1")), cacheKey(req("GET", "/titles?page=2")));
});
