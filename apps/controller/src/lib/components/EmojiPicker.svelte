<script lang="ts">
  import { EMOJI_GROUPS } from '$lib/content/emoji-picker';

  /**
   * The badge editor's emoji picker — `page.welcome.html:476` onward.
   *
   * The reference inlines 678 lines of Intercom's picker markup behind its `#emoji-picker` button:
   * a search box and six groups holding 635 emoji, each a `<span title="name">char</span>`. Ours
   * rendered the button and nothing behind it, which is a control whose only effect is its own
   * presence.
   *
   * Class names are the reference's own (`intercom-composer-popover`,
   * `intercom-emoji-picker-group-title`, …) because they are what its 325-line inline stylesheet
   * targets. They are carried across rather than renamed, so that stylesheet remains readable
   * against this markup.
   */
  let { onpick }: { onpick: (char: string) => void } = $props();

  let query = $state('');

  /**
   * Filtered by NAME, not by character.
   *
   * The reference's search box has no handler in the captured markup — Intercom's own script binds
   * it, and that script is not in the template. Filtering on `title` is what the widget visibly
   * does and is the only behaviour the evidence supports; nothing here invents a fuzzy match or a
   * keyword synonym list.
   */
  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_GROUPS;
    return EMOJI_GROUPS.map((g) => ({
      title: g.title,
      emoji: g.emoji.filter((e) => e.name.toLowerCase().includes(q))
    })).filter((g) => g.emoji.length > 0);
  });
</script>

<div class="intercom-composer-popover intercom-composer-emoji-popover">
  <div class="intercom-emoji-picker">
    <div class="intercom-composer-popover-header">
      <input
        class="intercom-composer-popover-input"
        placeholder="Search"
        aria-label="Search emoji"
        bind:value={query}
      />
    </div>
    <div class="intercom-composer-popover-body-container">
      <div class="intercom-composer-popover-body">
        <div class="intercom-emoji-picker-groups">
          {#each groups as group (group.title)}
            <div class="intercom-emoji-picker-group">
              <div class="intercom-emoji-picker-group-title">{group.title}</div>
              {#each group.emoji as emoji (group.title + emoji.name)}
                <!--
                  A BUTTON, where the reference uses a `<span>`. The only deliberate deviation here:
                  a span carrying a click handler is unreachable by keyboard and invisible to a
                  screen reader, and this is a grid of 635 of them. The class is unchanged, so the
                  reference's own stylesheet still applies; `type="button"` keeps it out of the
                  form's submit path.
                -->
                <button
                  class="intercom-emoji-picker-emoji"
                  type="button"
                  title={emoji.name}
                  onclick={() => onpick(emoji.char)}>{emoji.char}</button
                >
              {/each}
            </div>
          {/each}
          {#if groups.length === 0}
            <!-- Ours. The reference's search is bound by a script that is not in the template, so
                 what it shows for no matches was never captured — this states the outcome rather
                 than leaving an empty box that reads as broken. -->
            <div class="intercom-emoji-picker-group">
              <div class="intercom-emoji-picker-group-title">No emoji match “{query}”</div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
