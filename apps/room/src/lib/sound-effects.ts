import { Howl, Howler } from 'howler';

export type SoundEffectName =
  | 'beep'
  | 'pling'
  | 'cash'
  | 'audioReset'
  | 'fileShare'
  | 'qaAlert'
  | 'userJoin'
  | 'userLeave'
  | 'followed'
  | 'nonTradeAlert'
  | 'recordingStart'
  | 'recordingStop';

/**
 * The names and source order are decoded from the shipped SoundEffectsService.
 * fileShare.ogg is intentionally absent because the exact source URL currently
 * returns 404; fileShare.mp3 is the source service's working primary asset.
 */
export const SOUND_EFFECT_SOURCES: Record<SoundEffectName, readonly string[]> = {
  beep: ['/assets/sound/beep.mp3', '/assets/sound/beep.ogg'],
  pling: ['/assets/sound/pling.mp3', '/assets/sound/pling.ogg'],
  cash: ['/assets/sound/cash.mp3', '/assets/sound/cash.ogg'],
  audioReset: ['/assets/sound/userJoin.mp3', '/assets/sound/userJoin.ogg'],
  fileShare: ['/assets/sound/fileShare.mp3'],
  qaAlert: ['/assets/sound/clearly.mp3', '/assets/sound/clearly.ogg'],
  userJoin: ['/assets/sound/ding.mp3', '/assets/sound/ding.ogg'],
  userLeave: ['/assets/sound/userLeave.mp3', '/assets/sound/userLeave.ogg'],
  followed: ['/assets/sound/followed.mp3', '/assets/sound/followed.ogg'],
  nonTradeAlert: ['/assets/sound/nontrade.mp3', '/assets/sound/nontrade.ogg'],
  recordingStart: ['/assets/sound/recording-start.mp3', '/assets/sound/recording-start.ogg'],
  recordingStop: ['/assets/sound/recording-stop.mp3', '/assets/sound/recording-stop.ogg']
};

let sounds: Map<SoundEffectName, Howl> | null = null;

export function initializeSoundEffects() {
  if (typeof window === 'undefined' || sounds) return;

  Howler.autoUnlock = true;
  sounds = new Map(
    Object.entries(SOUND_EFFECT_SOURCES).map(([name, sources]) => [
      name as SoundEffectName,
      new Howl({ src: [...sources] })
    ])
  );
}

export function playSoundEffect(name: SoundEffectName) {
  initializeSoundEffects();
  sounds?.get(name)?.play();
}

export function setSoundEffectsVolume(volume: number) {
  Howler.volume(Math.min(1, Math.max(0, volume)));
}

export function unloadSoundEffects() {
  sounds?.forEach((sound) => sound.unload());
  sounds = null;
}
