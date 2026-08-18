<script lang="ts">
  /*
    `app-webcam-holder` — the row of draggable camera cards above the tab strip.

    ## Why this is its own file, on the capture's own boundary

    `PresentationArea.svelte` held the markup of TWO Angular components, and says so in its first
    line: *"`app-webcam-holder` + `app-presentationarea`"*. Its header then argues, correctly, that
    the seven TAB PANES belong together because `mainTab` is one value every tab reads and writes.
    That argument covers the tabs and says nothing about this — the strip is a SIBLING of the tab
    area upstream, not a pane inside it, and it shares no state with any tab.

    So the seam is the reference's, not one invented to make a number fall. It reads three things
    and writes none of them.

    ## It renders cards; it does not own cameras

    `presenters` is the SFU transport's list and arrives as a value. `RoomWebcams` owns the three
    attachments — placement, drag/resize, and putting a `MediaStream` into an element — and the
    reasoning for each is at the methods, in `#lib/room/webcams.ts`. Nothing here acquires a device,
    stops a track, or decides who may be on camera.
  */
  import type { WebcamPresenter } from '#lib/types.js';
  import type { RoomWebcams } from '#lib/room/webcams.js';

  interface Props {
    /** `previewWindowsVisible` — a presenter can hide every card without stopping any camera. */
    visible: boolean;
    /** The SFU transport's `webcamPresenters`, one entry per peer with a live camera. */
    presenters: WebcamPresenter[];
    /**
     * The card attachments, whole.
     *
     * The object rather than its four methods, because `unbound-method-contract.test.ts` records
     * that **the four webcam attachments were among thirteen props that threw on the first click in
     * every room** — a method handed over by reference loses `this`, and `svelte-check`, eslint and
     * the autofixer all pass on it. There is nothing here to hand over by reference.
     */
    webcams: RoomWebcams;
  }

  let { visible, presenters, webcams }: Props = $props();
</script>

<app-webcam-holder>
  {#if visible}
    <div class="webcam-wrapper d-flex justify-content-center flex-wrap align-items-end w-100">
      <!--
        Slot 0 is this peer's own camera. The capture keys both the card and the video by the
        presenter id (`webcamsHolder-{id}` / `webcamVideo-{id}`); this room rendered the templates
        with an empty suffix and fed neither of them, which is why turning the camera on lit the
        browser's in-use indicator and showed nothing. Slot 1 stays an unfed placeholder: a second
        presenter's camera arrives over the SFU, and that path is not wired yet.
      -->
      <!--
        ONE card per webcaming user, created and destroyed with the list - never a fixed pair.

        `app-room` keeps `webcamingUsers` and drives the cards through the gui bus:

          // camera on
          this.webcamingUsers.push(r); r.isMe = a;
          a && (r.localstream = mediaSoupService.localWebcamStream, this.camMuted = !1);
          this.guiEventBus.emit("newWebcamPresenter", r)

          subscribe("newWebcamPresenter",  i => this.addPresenterdWebcam(i))
          subscribe("removeWebcamPresenter", i => this.removePresenterWebcam(i))

          addPresenterdWebcam(e) {
            if (this.webcamsIdxs.includes(e._id)) return;          // NOP if present
            const s = this.container.createComponent(sL, i);       // sL = app-presenter-cams
            s.instance.muser = e; s.instance.pID = e._id;
            s.instance.pName = e.mediaValue.name;
          }
          removePresenterWebcam(e) { this.container.remove(o); delete this.webcams[e._id] }

        So the real cards are CREATED DYNAMICALLY, one per user with a live camera, and
        `removePresenterWebcam` destroys the component outright.

        The two static `<app-presenter-cams>` in `app-webcam-holder`'s template are a red herring:
        that template is `T(1,'app-presenter-cams')(2,'app-presenter-cams')` with NO inputs bound,
        so `muser` is undefined, `ngOnInit`'s `this.muser && (…)` short-circuits, `initDrag()` never
        runs - and `initDrag()` is the only thing that calls `.show()`. They are inert and never
        visible. Reproducing them as two rendered cards put two empty black boxes on screen before
        anyone touched the camera, and gave the second one an X that could not close anything.
      -->
      {#each presenters as presenter, index (presenter.id)}
        <app-presenter-cams>
          <div
            class="card webcamsHolder"
            id="webcamsHolder-{presenter.id}"
            {@attach webcams.card(presenter, index)}
          >
            <!--
              WRAPPED on the local branch, CALLED on the remote one, and the asymmetry is the
              class's rather than a slip. `attachLocal` IS the attachment, so referencing
              `webcams.attachLocal` would hand the attach directive a method with no `this` and
              throw on the first camera — the failure `unbound-method-contract.test.ts` executes.
              `attachRemote(id)` is a factory that RETURNS the attachment, so calling it binds
              `this` at the call, and the closure it hands back needs none.
            -->
            <video
              {@attach presenter.isMe
                ? (node: HTMLVideoElement) => webcams.attachLocal(node)
                : webcams.attachRemote(presenter.id)}
              {...{ autoplay: 'autoplay' } as Record<string, string>}
              class="webcamsHolderVideo"
              id="webcamVideo-{presenter.id}"
            ></video>
            <div class="overlay">
              <h5 class="pNameLabel m-0">
                {presenter.name}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span class="closeIcon" onclick={() => webcams.closePreview(presenter)}>
                  <i class="fas fa-times"></i>
                </span>
              </h5>
            </div>
          </div>
        </app-presenter-cams>
      {/each}
    </div>
  {/if}
</app-webcam-holder>
