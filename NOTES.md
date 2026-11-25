# NOTES

**Cause.** The key was `edge:{pathname}`, which encodes less than the response varies on. A cache key has to
describe everything that makes two responses different, and here the method was missing, so `POST
/titles/8812` and `GET /titles/8812` hashed to the same entry: the read populated it, the write hit it and
returned the stale body while the write itself was dropped. The query string was missing for the same
reason — `/titles?page=1` and `?page=2` shared one entry — and the content type was missing, so a form post
and a JSON post collided. Purges were built from the same function, so an invalidation computed the broken
key and landed next to the entry it was meant to delete.

**Fix.** The key is the request shape now: method (with `HEAD` folded into `GET` so it cannot fork a second
entry), path, query and normalised content type (`charset` stripped, lowercased, `-` when absent). Purges
enumerate the variants the edge stores for that path rather than deriving a single key, because
`caches.default.delete` takes an exact key and there is nothing to scan; that list is the one weak point —
if a new content type is ever accepted, `PURGE_CONTENT_TYPES` has to learn it, and a prefix index would
remove the need. The regression test posts to a cached path and asserts the response differs from the cached
`GET`; it fails on `main` and passes here.
