/* =============================================================================================
 * PTR SCREENSHARE DUMP — paste into the DevTools console of the room, then share a screen.
 * It downloads by itself.
 *
 * Why this exists, plainly: a real getDisplayMedia capture cannot be reproduced from here.
 * Headless Chrome answers every variant with "NotReadableError: Could not start video source" -
 * tab capture, entire-screen and monitor surfaces alike, headed or headless - and macOS gates
 * screen recording behind a permission this machine will not grant to an automated launch. Every
 * automated check of the screen share so far has used a canvas standing in for a desktop, which
 * fits any pane by construction and is exactly why a clipping bug survived it.
 *
 * So this measures the real thing, in your browser, on your screen, and writes a file.
 *
 * HOW TO USE
 *   1. Open the room, F12, Console, paste this whole file, press Enter.
 *   2. Share a screen the way you normally would. Share a second one if you can.
 *   3. It downloads ptr-screenshare-<timestamp>.json on its own about 12 seconds after the first
 *      screen starts. Or call __PTRSS.save() at any moment.
 *
 * WHAT IT RECORDS
 *   - the real capture: track settings, the resolution your display actually produced
 *   - geometry: every screen video and its container, measured, plus whether it overflows
 *   - the presentation area: which main tab is active, whether the Screens pane is visible,
 *     and how many named screen tabs are on screen
 *   - computed styles for the rules that size a screen, so a missing one is visible rather than
 *     inferred
 *   - live WebRTC outbound/inbound stats: frames actually encoded and sent
 *   - console errors and warnings captured from the moment this is pasted
 *
 * It records values only. No page state is changed, nothing is sent anywhere, and the file lands
 * in your Downloads folder for you to hand back.
 * ============================================================================================= */

(() => {
  if (window.__PTRSS) {
    console.warn('[PTR-SS] already armed — call __PTRSS.save() to download now');
    return;
  }

  /** The properties that decide whether a screen is visible and correctly sized. */
  const STYLE_PROPS = [
    'display',
    'visibility',
    'opacity',
    'position',
    'overflow',
    'object-fit',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'aspect-ratio',
    'transform',
    'z-index'
  ];

  const logs = [];
  const wrap = (level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      try {
        logs.push({
          level,
          at: new Date().toISOString(),
          text: args
            .map((a) => (a instanceof Error ? a.stack || a.message : String(a)))
            .join(' ')
            .slice(0, 500)
        });
      } catch {
        /* never let logging break the page */
      }
      original(...args);
    };
  };
  wrap('error');
  wrap('warn');
  window.addEventListener('unhandledrejection', (event) => {
    logs.push({
      level: 'unhandledrejection',
      at: new Date().toISOString(),
      text: String(event.reason).slice(0, 500)
    });
  });

  const rect = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      // offsetParent is null for a display:none subtree, which is the check that matters: a video
      // inside a hidden tab keeps a valid videoWidth and reports frames while nobody can see it.
      onscreen: r.width > 0 && r.height > 0 && element.offsetParent !== null
    };
  };

  const styles = (element) => {
    if (!element) return null;
    const computed = getComputedStyle(element);
    return Object.fromEntries(
      STYLE_PROPS.map((property) => [property, computed.getPropertyValue(property)])
    );
  };

  function screens() {
    return [...document.querySelectorAll('#screensTabsContent video')].map((video) => {
      const container = video.closest('[id^="video-screen-container"]') ?? video.parentElement;
      const pane = video.closest('.tab-pane');
      const videoRect = rect(video);
      const containerRect = rect(container);
      const track = video.srcObject?.getVideoTracks?.()[0] ?? null;
      return {
        videoId: video.id,
        containerId: container?.id ?? null,
        paneId: pane?.id ?? null,
        paneClasses: pane?.className ?? null,
        // The clipping evidence: what the display produced versus the box it was given.
        intrinsic: { width: video.videoWidth, height: video.videoHeight },
        videoRect,
        containerRect,
        overflowsX: !!(videoRect && containerRect) && videoRect.width > containerRect.width + 1,
        overflowsY: !!(videoRect && containerRect) && videoRect.height > containerRect.height + 1,
        paused: video.paused,
        currentTime: +video.currentTime.toFixed(2),
        hasSrcObject: !!video.srcObject,
        trackSettings: track ? track.getSettings() : null,
        trackLabel: track ? track.label : null,
        trackReadyState: track ? track.readyState : null,
        videoStyles: styles(video),
        containerStyles: styles(container),
        paneStyles: styles(pane)
      };
    });
  }

  function presentationArea() {
    const activeMain = document.querySelector('#mainTabs .nav-link.active');
    const screensPane = document.getElementById('screens');
    const tabs = [...document.querySelectorAll('#screenTabs li.nav-item')];
    return {
      activeMainTab: activeMain ? activeMain.textContent.trim() : null,
      activeMainTabClasses: activeMain ? activeMain.className : null,
      screensPaneRect: rect(screensPane),
      screensPaneStyles: styles(screensPane),
      screenTabs: tabs.map((li) => ({
        label: li.textContent.replace(/\s+/g, ' ').trim(),
        rect: rect(li),
        classes: li.className
      })),
      screensTabsContentRect: rect(document.getElementById('screensTabsContent')),
      // The empty state the capture shows when nobody is presenting.
      emptyStateText: [...document.querySelectorAll('#screens h3')].map((h) => h.textContent.trim())
    };
  }

  async function webrtc() {
    const connections = window.__ptrPeerConnections ?? [];
    const out = [];
    for (const pc of connections) {
      const rows = [];
      try {
        (await pc.getStats()).forEach((report) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            rows.push({
              dir: 'out',
              bytes: report.bytesSent,
              packets: report.packetsSent,
              framesEncoded: report.framesEncoded,
              framesSent: report.framesSent,
              width: report.frameWidth,
              height: report.frameHeight,
              limitation: report.qualityLimitationReason,
              encoder: report.encoderImplementation
            });
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            rows.push({
              dir: 'in',
              bytes: report.bytesReceived,
              packets: report.packetsReceived,
              framesReceived: report.framesReceived,
              framesDropped: report.framesDropped,
              width: report.frameWidth,
              height: report.frameHeight,
              pliCount: report.pliCount
            });
          }
          if (report.type === 'media-source' && report.kind === 'video') {
            rows.push({
              dir: 'source',
              width: report.width,
              height: report.height,
              fps: report.framesPerSecond,
              frames: report.frames
            });
          }
        });
      } catch (error) {
        rows.push({ error: String(error) });
      }
      out.push({
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        rows
      });
    }
    return out;
  }

  /*
   * RTCPeerConnection is wrapped so the WebRTC stats above have something to read. Done here rather
   * than asked of you, and it only records the instances - every call is forwarded untouched.
   */
  if (!window.__ptrPeerConnections) {
    window.__ptrPeerConnections = [];
    const Native = window.RTCPeerConnection;
    if (Native) {
      const Wrapped = function (...args) {
        const pc = new Native(...args);
        window.__ptrPeerConnections.push(pc);
        return pc;
      };
      Wrapped.prototype = Native.prototype;
      Object.assign(Wrapped, Native);
      window.RTCPeerConnection = Wrapped;
    }
  }

  async function snapshot(label) {
    return {
      label,
      at: new Date().toISOString(),
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      screenInfo: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight
      },
      presentationArea: presentationArea(),
      screens: screens(),
      webrtc: await webrtc()
    };
  }

  const snapshots = [];
  let saved = false;

  async function save() {
    if (saved) return;
    saved = true;
    snapshots.push(await snapshot('final'));
    const report = {
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      note:
        'Real getDisplayMedia evidence, captured in a live browser. Automated runs cannot ' +
        'produce this: headless Chrome answers every getDisplayMedia variant with ' +
        'NotReadableError, so every automated screenshare check uses a canvas stand-in.',
      snapshots,
      consoleLogs: logs
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const name = `ptr-screenshare-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    console.log(
      `%c[PTR-SS] downloaded ${name} — ${(blob.size / 1024).toFixed(1)} KB`,
      'color:#0a0;font-weight:bold'
    );
  }

  // Sample before anything is shared, so the "nobody is presenting" state is on record too.
  snapshot('before-share').then((s) => snapshots.push(s));

  /*
   * Arm on the first real screen share rather than on a timer alone: the interesting moment is
   * when a screen actually arrives, and waiting a fixed 12s from paste would usually miss it.
   * getDisplayMedia is wrapped only to notice the call - the stream is returned untouched.
   */
  const nativeGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getDisplayMedia = async (...args) => {
    const stream = await nativeGetDisplayMedia(...args);
    const track = stream.getVideoTracks()[0];
    console.log('[PTR-SS] real capture started:', track && JSON.stringify(track.getSettings()));
    snapshots.push({
      label: 'capture-started',
      at: new Date().toISOString(),
      requestedConstraints: JSON.stringify(args[0] ?? null),
      trackSettings: track ? track.getSettings() : null,
      trackLabel: track ? track.label : null
    });
    // Sample while it is running: 3s for the first frames, 8s once it has settled, then save.
    setTimeout(async () => snapshots.push(await snapshot('t+3s')), 3000);
    setTimeout(async () => snapshots.push(await snapshot('t+8s')), 8000);
    setTimeout(() => void save(), 12_000);
    return stream;
  };

  window.__PTRSS = { save, snapshot, snapshots };
  console.log(
    '%c[PTR-SS] armed — share a screen now. The file downloads ~12s after it starts.',
    'color:#0a6db1;font-weight:bold'
  );
  console.log('[PTR-SS] or call __PTRSS.save() whenever you like.');
})();
