# staging-edge

Cache and purge layer in front of the title service on staging.

- reads are cached at the edge
- writes purge the paths they touch
- the deploy job calls `PURGE /path` after a publish

`npm test` runs the key behaviour against a stand-in store; no runtime needed.
