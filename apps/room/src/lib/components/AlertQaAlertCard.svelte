<script lang="ts">
  import { ngbTooltipWith } from '#lib/ngb-tooltip.js';
  import { alertDateFormatter } from '#lib/message-formatters.js';

  /**
   * `e3e` — the alert card the Q&A modal reproduces in its own header.
   *
   * ## Why it is its own component
   *
   * `AlertQaModal.svelte` reached its `source-size-contract` ceiling on 2026-08-31, and the ratchet's
   * rule is that the answer is an extraction rather than a bigger number. This is the natural seam,
   * and it is the reference's own: `e3e` at bundle byte **2,332,074** is a sub-template of the modal
   * called once, gated by `O(7, o.qaMsg ? 7 : -1)` at byte **2,344,076**, and every one of its four
   * fields is gated again inside it — `O(4, …hasOwnProperty("avt") || …hasOwnProperty("pic") ? 4 :
   * -1)`, then `"t"`, `"n"`, `"txt"`.
   *
   * ## `QAM-08` — the card is drawn only when there IS an alert
   *
   * Rendered unconditionally with a `?? ''` behind each field, an alert-less open drew the FRAME of
   * a card: the bordered `admin-alert` box, a 50px mystery-man avatar, an empty `<strong>` and an
   * empty body, under a heading reading "Q&A for Alert:". `Modal` keeps its subtree mounted and
   * toggles `display`, so that is reachable state and not a theoretical one — every close leaves the
   * modal alive holding whatever the host last handed it.
   *
   * ## The heading comes WITH the card
   *
   * `d(4,"div",6)(5,"h5",7)` — const 6 `[1,"flex-fill"]` wrapping const 7
   * `["id","alertQALabel",1,"modal-title"]` — is the same node `H(7, e3e, …)` hangs off, so the two
   * travel together. `alertQALabel` stays here because it is what the dialog's `aria-labelledby`
   * names, and splitting a label from the element that carries the id is how one of them moves.
   */
  let {
    /**
     * The alert this thread belongs to, or nothing.
     *
     * The NARROW shape the host holds, copied rather than widened — see `QAM-10` and `QAM-11` below
     * for the two fields it deliberately does not carry and what that costs.
     */
    alert
  }: {
    alert: {
      id: number;
      senderName: string;
      body: string;
      senderAvatarUrl?: string;
      createdAt?: Date | string;
      evidenceTimestampText?: string;
    } | null;
  } = $props();

  const qaTimeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  /*
    The tooltip beside the visible time, which the reference BINDS rather than writes:
    `xn("ngbTooltip", Ct(1, 2, e.qaMsg.t, "short"))` against a visible `hh:mm a` (`Yxe`, byte
    2,331,119). Angular's `date:'short'` for en-US is `M/d/yy, h:mm a`, which is exactly what
    `alertDateFormatter` already produces — reused rather than re-derived, because a second formatter
    for the same shape is how two of them drift apart.

    Empty when there is no timestamp to format: `ngbTooltipWith` renders nothing for an empty string,
    which matches a reference binding that evaluates to nothing.
  */
  const tooltip = $derived.by(() => {
    if (!alert) return '';
    return 'createdAt' in alert && alert.createdAt
      ? alertDateFormatter.format(new Date(alert.createdAt as string | Date))
      : '';
  });

  /* Captured alerts carry the timestamp exactly as it was rendered; database rows are formatted. */
  const timestamp = $derived.by(() => {
    if (!alert) return '';
    if ('evidenceTimestampText' in alert && alert.evidenceTimestampText) {
      return alert.evidenceTimestampText;
    }
    return 'createdAt' in alert && alert.createdAt
      ? qaTimeFormatter.format(new Date(alert.createdAt as string | Date))
      : '';
  });
</script>

<div class="flex-fill">
  <h5 id="alertQALabel" class="modal-title">Q&amp;A for Alert:</h5>
  {#if alert}
    <div class="admin-alert mt-2">
      <!--
        `clas`, not `class`, and it is the capture's own typo: const 22 is
        `["clas","d-flex flex-column  align-items-center w-100"]`, including the double space. The
        attribute therefore styles nothing upstream either, which is why the layout below does not
        depend on it. Reproduced rather than corrected — correcting it would apply four classes the
        original never applied.
      -->
      <div {...{ clas: 'd-flex flex-column  align-items-center w-100' } as Record<string, string>}>
        <div class="mr-1 d-flex flex-row-reverse">
          <div
            class="d-flex flex-row-reverse justify-content-center align-items-start flex-nowrap mt-1"
          >
            <div class="avatar pl-1">
              <!--
                `QAM-11` — the fallback drops the sender's gravatar hash, and it is BLOCKED rather
                than wrong here. `z("src", e.qaMsg.pic || "https://secure.gravatar.com/avatar/" +
                e.qaMsg.avt + "?d=mm&s=50")` at byte 2,331,038 falls back to THAT SENDER's gravatar;
                this falls back to the hashless URL, which is the generic mystery-man for everyone.
                `avt` is the email hash, and the shape above has no field carrying it because
                `ModalHost.svelte:529` declares `targetMessage` without one. Adding an optional field
                here would leave it `undefined` at the type level while the value is present at
                runtime — the invisible mismatch this repository keeps finding. The one-line change
                is named in the audit register.

                `width` and `height` are ours: the capture's const 31 is `["alt","qaMsg.avt",3,"src"]`
                and sizes the image from `.avatar img { max-width: 50px }`, which is a layout shift
                this repository's standard forbids. 50 is that same measured cap.
              -->
              <img
                alt="qaMsg.avt"
                src={alert.senderAvatarUrl ?? 'https://secure.gravatar.com/avatar/?d=mm&s=50'}
                loading="lazy"
                width="50"
                height="50"
              />
            </div>
          </div>
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center w-100">
              <span
                {...{ placement: 'top' } as Record<string, string>}
                {@attach ngbTooltipWith(tooltip)}
                class="created-at mr-2">{timestamp}</span
              >
              <div class="d-flex align-items-center justify-content-between flex-nowrap">
                <!--
                  `QAM-09` — `Ne(" ", e.qaMsg.n, " ")` at byte 2,331,372 interpolates the name with a
                  leading AND a trailing space inside the `<strong>`. `username` is `mx-1` on a
                  `flex-nowrap` row beside the timestamp, so those two spaces are rendered separation
                  between the name and whatever sits against it. The braces are this repository's
                  standing idiom for keeping a captured space that Prettier and HTML folding would
                  otherwise eat; `AGENTS.md` records the autofixer suggestion it declines for exactly
                  this reason.
                -->
                <strong class="username mx-1">{' '}{alert.senderName}{' '}</strong>
              </div>
            </div>
            <!--
              `QAM-10` — the alert body is rendered as TEXT and the reference pipes it.

              `z("innerHTML", parseLinks(parseSymbols(e.qaMsg.txt, "chat", e.qaMsg.avt, null),
              preferences.chatGif, e.qaMsg._id, !1))` at byte 2,331,625, in one of two templates
              chosen by `O(0, sessData.copyTrades ? 0 : 1)` at byte 2,332,021 — `Xxe` with a
              `copyTradeOnClick` handler, `Jxe` without. So a `$TICKER` in the alert is coloured
              here, a pasted URL is a link, and an image URL renders as the image. Here it is the raw
              string, so a member reading the Q&A sees markup-free text where the same alert in the
              log beneath the modal is fully piped.

              BLOCKED, on the same field `QAM-11` needs. `MessageBody` is the component that renders
              those segments and it emits `image` clicks, which `room/message-actions.svelte.ts:497`
              resolves through `item.targetUrl`. `ModalHost.svelte:529` declares `targetMessage`
              without `targetUrl`, so nothing here can name the URL the dispatcher would open — and
              rendering the image with a click that cannot act is the control-with-no-effect this
              repository refuses. The one-line change is named in the audit register.
            -->
            <div class="msg-left text-formated preText ml-2 mr-2 p-0">{alert.body}</div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
