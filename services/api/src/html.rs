//! Sanitising member-authored HTML.
//!
//! `notes.content_html` is rich text one member writes and every other member renders. Stored
//! without sanitising it is a stored-XSS vector: `can_edit_notes` is a routine permission, and
//! holding it should not mean being able to run script in the room owner's browser.
//!
//! # Why on write, not on render
//!
//! Sanitising at render time means every consumer has to remember - the web page, a future
//! mobile client, an export, a search index. Sanitising once on the way in means the column only
//! ever contains safe markup, and a reader written next year inherits that without knowing this
//! module exists. The cost is that the original markup is not recoverable, which is the correct
//! trade for a field whose only purpose is to be displayed.

use std::sync::OnceLock;

/// The allowed subset.
///
/// Deliberately small: notes are trading plans and checklists, not documents. Everything that
/// can execute, load or navigate somewhere unexpected is out - `script`, `style`, `iframe`,
/// `object`, `form`, and every `on*` attribute (ammonia strips those unconditionally).
///
/// `OnceLock` because building the builder allocates several sets, and this runs on the write
/// path of every note save.
fn cleaner() -> &'static ammonia::Builder<'static> {
    static CLEANER: OnceLock<ammonia::Builder<'static>> = OnceLock::new();
    CLEANER.get_or_init(|| {
        let mut builder = ammonia::Builder::default();
        builder
            .tags(
                [
                    "p",
                    "br",
                    "strong",
                    "em",
                    "u",
                    "s",
                    "code",
                    "pre",
                    "blockquote",
                    "ul",
                    "ol",
                    "li",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "a",
                    "hr",
                    "table",
                    "thead",
                    "tbody",
                    "tr",
                    "th",
                    "td",
                    "span",
                    "div",
                ]
                .into_iter()
                .collect(),
            )
            // No `style`: an attacker-controlled style attribute is a phishing surface
            // (position/opacity tricks) even without script.
            .generic_attributes(["class"].into_iter().collect())
            .link_rel(Some("noopener noreferrer nofollow"));
        builder
    })
}

/// Returns the sanitised form of `input`.
///
/// Never fails: anything it cannot make safe is removed rather than rejected, so a paste from a
/// word processor loses its cruft instead of the save losing the note.
#[must_use]
pub fn sanitise(input: &str) -> String {
    cleaner().clean(input).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_script_tag_does_not_survive() {
        let cleaned = sanitise("<p>plan</p><script>alert(document.cookie)</script>");
        assert!(cleaned.contains("plan"));
        assert!(!cleaned.contains("script"), "{cleaned}");
        assert!(!cleaned.contains("alert"), "{cleaned}");
    }

    #[test]
    fn event_handlers_are_stripped_from_otherwise_allowed_tags() {
        // The subtle one: `<p>` is allowed, so a naive tag allowlist would keep the handler.
        let cleaned = sanitise(r#"<p onclick="steal()">click me</p>"#);
        assert!(cleaned.contains("click me"));
        assert!(!cleaned.contains("onclick"), "{cleaned}");
    }

    #[test]
    fn javascript_urls_are_removed() {
        let cleaned = sanitise(r#"<a href="javascript:alert(1)">go</a>"#);
        assert!(!cleaned.contains("javascript:"), "{cleaned}");
    }

    #[test]
    fn an_ordinary_link_survives_and_gains_a_safe_rel() {
        let cleaned = sanitise(r#"<a href="https://example.com">docs</a>"#);
        assert!(cleaned.contains("https://example.com"), "{cleaned}");
        // `noopener` matters: without it a `target=_blank` link hands `window.opener` to a
        // third-party page.
        assert!(cleaned.contains("noopener"), "{cleaned}");
    }

    #[test]
    fn the_formatting_a_note_actually_uses_is_preserved() {
        let source = "<h2>Plan</h2><p><strong>AAPL</strong> long</p><ul><li>entry 190</li></ul>";
        let cleaned = sanitise(source);
        for fragment in ["<h2>", "<strong>", "<ul>", "<li>", "entry 190"] {
            assert!(cleaned.contains(fragment), "lost {fragment}: {cleaned}");
        }
    }

    #[test]
    fn style_attributes_and_iframes_are_removed() {
        let cleaned = sanitise(
            r#"<div style="position:fixed;opacity:0">x</div><iframe src="https://evil"></iframe>"#,
        );
        assert!(!cleaned.contains("style="), "{cleaned}");
        assert!(!cleaned.contains("iframe"), "{cleaned}");
    }

    #[test]
    fn sanitising_is_idempotent() {
        // Content is stored sanitised, so it goes through this again on the next edit. A second
        // pass must not keep eroding it.
        let once = sanitise("<p>plan <strong>A</strong></p>");
        assert_eq!(sanitise(&once), once);
    }
}
