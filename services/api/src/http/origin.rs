//! Exact browser-origin checks for cookie-authenticated state changes and WebSockets.
//!
//! CORS is a response-reading policy, not a request-authentication boundary. A sibling
//! subdomain is also "same-site" for cookies, so `SameSite` alone does not stop it from sending
//! an authenticated request to this host. The configured full origin is therefore compared byte
//! for byte, and Fetch Metadata is accepted only when it independently says `same-origin`.

use axum::http::{HeaderMap, header};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum BrowserOriginError {
    Missing,
    Multiple,
    Mismatch,
    FetchSite,
}

impl BrowserOriginError {
    pub(crate) const fn reason(self) -> &'static str {
        match self {
            Self::Missing => "missing_origin",
            Self::Multiple => "multiple_origin_headers",
            Self::Mismatch => "origin_mismatch",
            Self::FetchSite => "fetch_site_not_same_origin",
        }
    }
}

/// Requires exactly one byte-for-byte matching `Origin` header.
///
/// `Sec-Fetch-Site` is not universally sent by non-browser clients, so absence is allowed. When a
/// browser supplies it, however, only `same-origin` is consistent with the exact Origin check;
/// `same-site` is specifically not enough because sibling subdomains are part of the threat model.
pub(crate) fn require_exact_browser_origin(
    headers: &HeaderMap,
    trusted_origin: &str,
) -> Result<(), BrowserOriginError> {
    let mut origins = headers.get_all(header::ORIGIN).iter();
    let origin = origins.next().ok_or(BrowserOriginError::Missing)?;
    if origins.next().is_some() {
        return Err(BrowserOriginError::Multiple);
    }
    if origin.as_bytes() != trusted_origin.as_bytes() {
        return Err(BrowserOriginError::Mismatch);
    }

    let mut fetch_sites = headers.get_all("sec-fetch-site").iter();
    if let Some(site) = fetch_sites.next()
        && (fetch_sites.next().is_some() || site.as_bytes() != b"same-origin")
    {
        return Err(BrowserOriginError::FetchSite);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    const TRUSTED: &str = "https://app.example.test";

    fn headers(origin: Option<&str>, fetch_site: Option<&str>) -> HeaderMap {
        let mut headers = HeaderMap::new();
        if let Some(origin) = origin {
            headers.insert(header::ORIGIN, HeaderValue::from_str(origin).unwrap());
        }
        if let Some(fetch_site) = fetch_site {
            headers.insert("sec-fetch-site", HeaderValue::from_str(fetch_site).unwrap());
        }
        headers
    }

    #[test]
    fn the_exact_origin_and_optional_same_origin_metadata_pass() {
        assert_eq!(
            require_exact_browser_origin(&headers(Some(TRUSTED), None), TRUSTED),
            Ok(())
        );
        assert_eq!(
            require_exact_browser_origin(&headers(Some(TRUSTED), Some("same-origin")), TRUSTED,),
            Ok(())
        );
    }

    #[test]
    fn missing_malformed_sibling_and_cross_site_origins_fail_closed() {
        for (origin, fetch_site, expected) in [
            (None, None, BrowserOriginError::Missing),
            (Some("not an origin"), None, BrowserOriginError::Mismatch),
            (
                Some("https://sibling.example.test"),
                Some("same-site"),
                BrowserOriginError::Mismatch,
            ),
            (
                Some("https://attacker.invalid"),
                Some("cross-site"),
                BrowserOriginError::Mismatch,
            ),
            (
                Some(TRUSTED),
                Some("same-site"),
                BrowserOriginError::FetchSite,
            ),
            (
                Some(TRUSTED),
                Some("cross-site"),
                BrowserOriginError::FetchSite,
            ),
        ] {
            assert_eq!(
                require_exact_browser_origin(&headers(origin, fetch_site), TRUSTED),
                Err(expected)
            );
        }
    }

    #[test]
    fn duplicate_origin_headers_are_refused() {
        let mut headers = HeaderMap::new();
        headers.append(header::ORIGIN, HeaderValue::from_static(TRUSTED));
        headers.append(header::ORIGIN, HeaderValue::from_static(TRUSTED));
        assert_eq!(
            require_exact_browser_origin(&headers, TRUSTED),
            Err(BrowserOriginError::Multiple)
        );
    }
}
