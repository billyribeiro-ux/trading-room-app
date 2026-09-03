# Decoded v4 component corpus

This directory is the separate 51-component extraction of the pinned v4 bundle in the parent
directory. It does not replace or modify `docs/source/components/`, which remains the archived
predecessor corpus.

`manifest.json` records each raw component span's byte count and SHA-256 digest, plus the generated
readable and style artifacts. The raw component digests continue to identify the unmodified pinned
bundle.

The readable `app-session-login.compiled.js` and `app-session-login.full.js` outputs replace the
bundle's Gmail-shaped example address with the reserved `example.com` equivalent. Their readable
byte counts and digests in the manifest are computed after that privacy redaction. No executable
application source consumes these decoded files.
