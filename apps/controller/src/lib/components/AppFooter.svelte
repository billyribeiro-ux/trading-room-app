<!-- The controller's ngInclude footer: `.p-lg.text-center`, measured at
     424.5,1033.992,1140x91 — a sibling of the page content INSIDE the
     container, not a band below it, which is why the root layout renders it
     within `.acc-container` rather than after it.

     `.mr-sm` is 5px: the © span ends at 922.992 and "2026" starts at 931.891,
     an 8.899px gap — that margin plus the 3.899px space between the tags. The
     run is centred on 994.5, the container's midpoint.

     The reference closes with `<br>` and an empty binding. Both are dropped: a
     trailing <br> opens a second line box, which would make this 111 tall
     rather than the 91 that was measured. -->
<div class="acc-page-footer">
  <hr />
  <span class="mr-sm">©</span>
  <span class="mr-sm">2026</span>
  <span>TradingRoomApp</span>
</div>
