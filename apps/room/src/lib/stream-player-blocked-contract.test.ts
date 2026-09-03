import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modal = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const pane = readFileSync(new URL('./components/PublicPlayerPane.svelte', import.meta.url), 'utf8');
const remote = readFileSync(new URL('../routes/public-player.remote.ts', import.meta.url), 'utf8');
const load = readFileSync(
  new URL('../routes/player/[room]/+page.server.ts', import.meta.url),
  'utf8'
);
const page = readFileSync(new URL('../routes/player/[room]/+page.svelte', import.meta.url), 'utf8');

describe('the public Stream Player is a revocable least-privilege product path', () => {
  it('offers real presenter operations and a one-time link instead of a local preference', () => {
    expect(modal).toContain('<PublicPlayerPane');
    expect(pane).toContain('enablePublicPlayer');
    expect(pane).toContain('disablePublicPlayer');
    expect(pane).toContain('playerLink');
    expect(modal).not.toContain("onPreferenceChange('streamingPlayerEnabled'");
  });

  it('stores only a digest and supports revocation and expiry', () => {
    expect(remote).toContain("createHash('sha256').update(token).digest('hex')");
    expect(remote).toContain('revokedAt');
    expect(remote).toContain('expiresAt');
    expect(remote).not.toContain('tokenHash: token');
  });

  it('validates the public grant before exchanging for a short-lived read-only media token', () => {
    expect(load).toContain("createHash('sha256').update(grant).digest('hex')");
    expect(load).toContain('requestPublicStreamReadToken');
    expect(load).toContain("'cache-control': 'private, no-store'");
  });

  it('renders screenshare playback only and contains no collaboration surfaces', () => {
    expect(page).toContain('Screenshare-only public player');
    expect(page).toContain('mtxPlaylistUrl(selected, data.streamServerMTX, data.mtxToken)');
    for (const forbidden of ['RoomMessage', 'ChatComposer', 'PrivateChat', 'RoomNotes']) {
      expect(page).not.toContain(forbidden);
    }
  });
});
