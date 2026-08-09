/**
 * Closed captions: the speaker's side.
 *
 * Wraps the Web Speech API with the captured client's exact configuration and result policy. Every
 * constant here is quoted from `docs/source/main.d6d3c112b59b7d0d.js`:
 *
 * ```js
 * const i = window.SpeechRecognition || window.webkitSpeechRecognition;
 * let o = new i;
 * o.lang = "en-US", o.interimResults = !0, o.continuous = !0, o.maxAlternatives = 1;
 * ```
 *
 * and the throttle that decides what actually leaves the machine:
 *
 * ```js
 * (F || S - s >= 500) && (e.appEventBus.emit("sendSpeechReco",
 *   { text: _, isFinal: F, timestamp: S, lang: o.lang, sender: … }), s = S)
 * ```
 *
 * so an interim result is emitted at most every 500ms, and a final one always. That matters: with
 * `interimResults` on, `onresult` fires per syllable, and relaying each one would flood the room.
 */

/** The captured settings. Not defaults - the capture sets all four explicitly. */
export const RECOGNITION_LANG = 'en-US';
export const RECOGNITION_INTERIM_RESULTS = true;
export const RECOGNITION_CONTINUOUS = true;
export const RECOGNITION_MAX_ALTERNATIVES = 1;

/** `S - s >= 500` - the interim throttle. A final result bypasses it. */
export const INTERIM_THROTTLE_MS = 500;

/**
 * `e.speechRecoConsecutiveErrors >= 5` - the give-up threshold.
 *
 * Recognition restarts constantly by design (`continuous` still ends on silence), so a single error
 * means nothing; five in a row means the service or the microphone is genuinely gone.
 */
export const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Errors the capture treats as permanent, stopping without a retry:
 * `"not-allowed" === _ || "service-not-allowed" === _ || "language-not-supported" === _`.
 */
export const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported'
]);

export type SpeechRecoResult = {
  text: string;
  isFinal: boolean;
  timestamp: number;
  lang: string;
};

export type SpeechRecoOptions = {
  /** Called for every result that passes the throttle. */
  onresult: (result: SpeechRecoResult) => void;
  /** Called when recognition stops for good, with the error that ended it. */
  onfatal?: (reason: string) => void;
  /**
   * Whether the microphone is still usable. The capture checks `isMicTrackAlive()` on an
   * `audio-capture` error and stops permanently if the track has died, rather than restarting
   * against a microphone that is gone.
   */
  isMicAlive?: () => boolean;
  now?: () => number;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

/** `window.SpeechRecognition || window.webkitSpeechRecognition`, absent on Firefox. */
export function recognitionConstructor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Concatenates a result event into one line, the way the capture does:
 *
 * ```js
 * for (let M = f.resultIndex; M < f.results.length; ++M) {
 *   const B = f.results[M]; _ += B[0].transcript, B.isFinal && (F = !0)
 * }
 * _ = _.trim();
 * ```
 *
 * Note it starts at `resultIndex`, not 0 - earlier results have already been sent - and that ANY
 * final segment marks the whole line final.
 */
export function collectTranscript(event: SpeechRecognitionEventLike): {
  text: string;
  isFinal: boolean;
} {
  let text = '';
  let isFinal = false;
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    text += result[0]?.transcript ?? '';
    if (result.isFinal) isFinal = true;
  }
  return { text: text.trim(), isFinal };
}

/**
 * Runs recognition until stopped.
 *
 * Returns a stop function. Safe to call when the API is missing - it returns a no-op rather than
 * throwing, because Firefox has no SpeechRecognition and captions are an enhancement, not a
 * requirement.
 */
export function startSpeechRecognition(options: SpeechRecoOptions): () => void {
  const Recognition = recognitionConstructor();
  if (!Recognition) {
    options.onfatal?.('speech recognition is not supported in this browser');
    return () => {};
  }

  const now = options.now ?? (() => Date.now());
  const recognition = new Recognition();
  recognition.lang = RECOGNITION_LANG;
  recognition.interimResults = RECOGNITION_INTERIM_RESULTS;
  recognition.continuous = RECOGNITION_CONTINUOUS;
  recognition.maxAlternatives = RECOGNITION_MAX_ALTERNATIVES;

  let lastSentAt = 0;
  let consecutiveErrors = 0;
  let stopped = false;

  recognition.onresult = (event) => {
    consecutiveErrors = 0;
    const { text, isFinal } = collectTranscript(event);
    if (!text.length) return;

    const at = now();
    // `F || S - s >= 500`: finals always go, interims at most twice a second.
    if (!isFinal && at - lastSentAt < INTERIM_THROTTLE_MS) return;
    lastSentAt = at;
    options.onresult({ text, isFinal, timestamp: at, lang: recognition.lang });
  };

  recognition.onerror = (event) => {
    const reason = event.error || 'unknown';
    // `"no-speech" !== _` - silence is the normal state of a room, not an error.
    if (reason === 'no-speech') return;

    if (FATAL_ERRORS.has(reason)) {
      stopped = true;
      options.onfatal?.(reason);
      return;
    }
    if (reason === 'audio-capture' && options.isMicAlive?.() === false) {
      stopped = true;
      options.onfatal?.('the microphone is no longer available');
      return;
    }
    consecutiveErrors += 1;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      stopped = true;
      options.onfatal?.(`speech recognition failed ${consecutiveErrors} times in a row`);
    }
  };

  // `continuous` still ends on a long silence, so it has to be restarted to keep captioning.
  recognition.onend = () => {
    if (stopped) return;
    try {
      recognition.start();
    } catch {
      // Already starting; the next `onend` will retry.
    }
  };

  try {
    recognition.start();
  } catch (error) {
    options.onfatal?.(String(error));
    return () => {};
  }

  return () => {
    stopped = true;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // Already gone.
    }
  };
}
