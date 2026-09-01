<!--
  `app-typing-indicator-dots` — the three blinking dots beside "[2] alice,bob".

  ## Why this exists, and what it corrects

  Both chat columns carried a paragraph saying the dots were NOT reproduced, and it gave a reason
  that was false: *"neither `app-typing-indicator-dots` nor its `.typing-indicator` class has a
  single rule in any stylesheet this repository holds … inventing the animation would be inventing a
  design."*

  Half of that is true and half of it is not. The CLASS really has no rule in
  `captured-runtime-components.css` — grep returns three hits and all three are
  `.typing-indicator-container`, a different class. But the design is not missing: an Angular
  component's own `styles:[…]` array is not in the captured stylesheets because it is injected at
  runtime from the BUNDLE, and this component's array is right there beside its template. Read
  2026-09-01, verbatim:

  ```js
  selectors:[["app-typing-indicator-dots"]],decls:4,vars:0,consts:[[1,"typing-indicator"]],
  template:function(i,o){1&i&&(d(0,"div",0),T(1,"span")(2,"span")(3,"span"),u())},
  styles:[".typing-indicator[_ngcontent-%COMP%]{display:flex!important}
           .typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{height:3px;width:3px;
             float:left;margin:0 1px;background-color:#9e9ea1;display:block;border-radius:50%;
             opacity:.4}
           .typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:nth-of-type(1){
             animation:1.5s _ngcontent-%COMP%_blink infinite .3333s}
           …:nth-of-type(2){animation:1.5s …_blink infinite .6666s}
           …:nth-of-type(3){animation:1.5s …_blink infinite .9999s}
           @keyframes _ngcontent-%COMP%_blink{50%{opacity:1}}"]
  ```

  So the whole appearance — 3px circles, `#9e9ea1`, resting opacity `.4`, a 1.5s blink staggered a
  third of a cycle apart — is specified by the capture to the last decimal. Nothing here is
  invented, which is the entire difference between this and the paragraph it replaces.

  **The lesson is the one this session keeps re-learning:** a recorded reason is not evidence. That
  one had been written down twice, was half right, and had held since 2026-08-28.

  ## Scoped `<style>`, not `app.css`

  Angular scoped these rules to the component with `_ngcontent-%COMP%`, and Svelte's scoped block is
  the same thing with a different attribute. `captured-runtime-components.css` is GENERATED and must
  not be hand-edited, and `app.css` is the global sheet — putting a `.typing-indicator` rule there
  would widen a selector the reference deliberately kept narrow.
-->
<app-typing-indicator-dots>
  <div class="typing-indicator"><span></span><span></span><span></span></div>
</app-typing-indicator-dots>

<style>
  /*
    `display: flex` is `!important` in the capture. Kept, because the container it sits inside is
    itself `d-flex` and Bootstrap's utility would otherwise win the cascade on specificity ties —
    which is presumably why upstream reached for it.
  */
  .typing-indicator {
    display: flex !important;
  }

  /*
    `float: left` beside `display: block` inside a flex parent: floats do not apply to flex items,
    so the declaration is inert here exactly as it is inert there. Transcribed rather than dropped —
    what the reference ships is the specification, and a reader who diffs the two should find them
    the same rather than wonder which of the two "cleaned it up".
  */
  .typing-indicator span {
    height: 3px;
    width: 3px;
    float: left;
    margin: 0 1px;
    background-color: #9e9ea1;
    display: block;
    border-radius: 50%;
    opacity: 0.4;
  }

  .typing-indicator span:nth-of-type(1) {
    animation: 1.5s blink infinite 0.3333s;
  }

  .typing-indicator span:nth-of-type(2) {
    animation: 1.5s blink infinite 0.6666s;
  }

  .typing-indicator span:nth-of-type(3) {
    animation: 1.5s blink infinite 0.9999s;
  }

  @keyframes blink {
    50% {
      opacity: 1;
    }
  }

  /*
    OURS, and the only line here the capture does not have. The dots blink for as long as somebody
    is typing, which is content that blinks indefinitely — the case WCAG 2.2.2 is about. Honouring
    the setting costs nothing when it is unset, and the dots still render at their resting opacity
    when it is, so the indicator keeps working rather than disappearing.

    It is the first `prefers-reduced-motion` block in this application. That makes it a convention
    with one member, which is worth saying out loud: the next animated thing added here should join
    it rather than leave it alone as a one-off.
  */
  @media (prefers-reduced-motion: reduce) {
    .typing-indicator span {
      animation: none;
    }
  }
</style>
