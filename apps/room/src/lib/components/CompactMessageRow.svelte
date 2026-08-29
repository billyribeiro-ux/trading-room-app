<script lang="ts">
  import { formatCompactTime } from '#lib/compact-message-time.js';

  /*
    `app-st-compactmessage` — ONE row of a private-message log.

    ## Why this is a component and not markup in two places

    The reference renders this component in two surfaces from one definition: the private-chat
    panel's scroller (`logType="pc"`) and the all-user private-message modal
    (`LMe` at bundle byte 2,417,000, `["logType","pc","isP","isP",3,"msg","prevD","id"]`). This
    repository had the first as inline markup inside `PrivateChatPanel.svelte`, and the modal was
    about to become a second copy of the same transcription.

    A transcription written twice is two transcriptions. The next capture correction lands on one of
    them, both keep passing their own tests, and the two surfaces quietly disagree — which is the
    failure `buildMessageChrome` records for the message chrome, one layer up.

    ## The link split lives here too

    It was `bodySegmentsPrivate`, a snippet on `+page.svelte` threaded into the panel as a prop.
    Splitting a message body on URLs is not a decision a PAGE makes, and passing it as a snippet
    meant the modal would have needed the same snippet threaded through `RoomOverlays` and
    `ModalHost` to render the same rows. It is the row's own business and it is here.

    ## `prevD` is NOT reproduced, and that is recorded rather than left looking finished

    Upstream passes the PREVIOUS row's timestamp so the component can draw a date separator. Neither
    surface here draws one — the panel never did — so nothing is passed. Adding the separator is a
    change to this file and both call sites keep working; inventing a half of it would not be.
  */
  interface Props {
    /** One row, in the shape `#lib/room/private-chat.svelte.ts` puts on the wire. */
    readonly message: {
      readonly _id: string;
      readonly n: string;
      readonly txt: string;
      readonly t: number;
      /*
      OPTIONAL, and read as a presenter only when it is exactly `true`. `PrivateChatRow` carries it
      as `boolean | undefined` because a frame off the private channel need not include it, and the
      row that decides whether a name is styled as a presenter must not treat "absent" as "yes".
    */
      readonly isA?: boolean;
    };
  }

  let { message }: Props = $props();
</script>

<app-st-compactmessage id="pcm-{message._id}">
  <div class="msg-box pb-1">
    <div class="d-flex justify-content-between align-items-center w-100">
      <strong class={['username mx-1', { presUser: message.isA === true }]}>{message.n}</strong>
      <span class="msg-time mr-1">{formatCompactTime(message.t)}</span>
    </div>
    <div class="msg-left text-formated preText ml-2 mr-2 p-0">
      <!--
        Unkeyed: the parts come straight out of `split()` on one message and are replaced wholesale.
        An index key here reads as identity and provides none — `RoomMessage.bodySegments` carries
        the full reasoning, and `each-key-contract.test.ts` enforces the distinction. The disable is
        there because `require-each-key` cannot express "this list has no identity"; the docs' rule
        is the specific one and it forbids the only key available.
      -->
      <!-- eslint-disable-next-line svelte/require-each-key -->
      {#each message.txt.split(/((?:http|https|ftp):\/\/[\w?=&.@/\-;#~%]+)/gi) as part}
        {#if /^(?:http|https|ftp):\/\//i.test(part)}<a
            href={part}
            target="_blank"
            rel="noreferrer"
            class="linkColor"
            onclick={(event) => event.stopPropagation()}>{part}</a
          >{:else}{part}{/if}
      {/each}
    </div>
  </div>
</app-st-compactmessage>
