# Redactions applied to this decode

The decode is complete. Personal identifiers, captured email literals, and
complete or truncated JWT-like values with decoded identity claims were replaced
with stable evidence tokens or reserved `example.com` addresses. The surrounding
structure and findings remain intact; no finding depends on the removed literals.

| Token | What it stands for |
|---|---|
| `[OWNER_EMAIL]` | the account owner's real email address |
| `[OWNER_NAME]` | the account owner's real display name |
| `[OWNER_SHORT_NAME]` | a captured short-form owner/member name |
| `[OWNER_JWT_NAME]` | the real full name carried in a captured JWT claim |
| `[OWNER_USER_ID]` | the person-linked user ObjectId carried in captured identity data |
| `[MEMBER_A_EMAIL]` | a second real member's email address |
| `[MEMBER_A_LAST_LOGIN]` | a real member's captured last-login timestamp |
| `[GRAVATAR_MD5_A]` | gravatar hash for one member — an MD5 of their email, i.e. a **reversible** identifier |
| `[GRAVATAR_MD5_B]` | gravatar hash for the other member |
| `[EMPTY_AVATAR_SOURCE_MD5]` | a distinct hash-derived identifier from the supplied empty-avatar source filename/URL |
| `[REDACTED_CAPTURE_JWT]` | a complete or truncated captured JWT-like value whose decoded claims contained personal identity data |
| `[REDACTED_ACTIVE_JWT]` | a captured reusable JWT removed before the repository's first public commit |

Each identity token is applied consistently across every file, so cross-references
still line up. API documentation examples use deterministic `userN@example.com`
aliases, and captured form placeholders use `user@example.com`.

## Where the unredacted values still live

- `evidence-dumps/NEXT-STEP/ptr1.json` and `evidence-dumps/NEXT-STEP/prt2.json` — the
  original captures. **Gitignored** (`.gitignore`: `evidence-dumps/NEXT-STEP/*.json`)
  because they also carry a live HS256 JWT naming the owner.
- `/tmp/ptr-decode/ptr1/` and `/tmp/ptr-decode/prt2/` — the decoded slices, outside the repo.
- `/tmp/decoded-preredaction-backup/` — a verbatim copy of these reports as first written.

Legacy Git commits before the 2026-08-02 production-containment remediation also
contained the owner display name, a reversible Gravatar identifier, and encoded
identity claims inside truncated JWT evidence. The current tree is redacted and
the shipped avatar asset has a neutral filename. Removing those identifiers from
earlier public Git objects requires a coordinated history rewrite; ordinary
follow-up commits do not erase prior objects.

The complete, still-unexpired JWT formerly embedded twice in
`evidence-dumps/main-nav-login-clicked/file` was replaced with
`[REDACTED_ACTIVE_JWT]` before the repository's first public commit. The
surrounding launch-link markup remains intact, so the file still proves the DOM
contract without publishing a reusable credential.

Restricted originals remain outside the tracked repository. Do not copy their
literal identity values back into source, reports, issues, or logs.

## Also present and deliberately NOT redacted

- **JWT claim-shape documentation.** Reports retain the names of contract fields
  such as `name`, `email`, `id`, `type`, and `exp`, but encoded values carrying
  identity claims are replaced with `[REDACTED_CAPTURE_JWT]`.
- **`john@…` / `jane@…` in `ptr1-P21-settings-general.md`** — sample values inside the app's own help
  text, not real people.
- **Room and enterprise ObjectIds** — these identify product records and much of
  the decode's cross-referencing depends on them. The person-linked captured user
  ObjectId is redacted as `[OWNER_USER_ID]`.
- **The reCAPTCHA site key and challenge tokens** — a site key is public by design; the challenge
  tokens are single-use and long expired.

## The standing rule for the rebuild

None of this data may be hard-coded into the SvelteKit app. Every user-identifying value comes from the
API at runtime or renders as an explicit honest-pending state. A screenshot that looks complete because
it has fake rows in it is a failed screenshot.
