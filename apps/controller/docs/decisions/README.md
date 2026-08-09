# Architecture decisions

Durable decisions are recorded as `NNNN-short-title.md`. A decision is immutable
history: supersede it with a newer record rather than rewriting its outcome.

Each record contains status, date, context, decision, consequences, verification,
and any SSOT sections affected.

Accepted decisions:

- [0001 — Establish the engineering SSOT](0001-engineering-ssot.md)
- [0002 — Persist owner-visible API secrets encrypted at rest](0002-owner-visible-api-secrets.md)
- [0003 — Adopt the Vercel, Rust, PostgreSQL, and mediasoup production boundary](0003-vercel-rust-postgresql-control-plane.md)
- [0004 — Where CSS lives: global sheets vs component `<style>`](0004-css-architecture.md)
