//! Determining the client's IP address behind a reverse proxy.
//!
//! This is security-critical rather than cosmetic: every IP-keyed rate limit, and the
//! `refresh_tokens.ip` audit column, are only as trustworthy as this function.
//!
//! `X-Forwarded-For` is append-only and **attacker-controlled at the left**. A client can
//! send `X-Forwarded-For: 1.2.3.4` and the first proxy will append the real address,
//! producing `1.2.3.4, <real>`. Taking the leftmost entry - the common mistake - therefore
//! lets anyone forge any address and rotate rate-limit keys at will.
//!
//! The only entries that can be trusted are the ones **our own** proxies appended, which
//! are the rightmost `TRUSTED_PROXY_HOPS` of them. So: count that many from the right and
//! take the next one along. With zero configured hops the header is ignored entirely and
//! the peer address is used, which is correct for a directly-exposed listener.

use std::net::{IpAddr, SocketAddr};

use axum::http::HeaderMap;

const X_FORWARDED_FOR: &str = "x-forwarded-for";

/// Resolves the client address from the peer address and `X-Forwarded-For`.
///
/// `trusted_hops` is how many reverse proxies sit in front of this process. Getting it
/// wrong is harmful in both directions: too high and a client can spoof its address by
/// padding the header; too low and every request appears to come from the load balancer,
/// so one IP-keyed limit throttles the entire site.
pub fn resolve(
    headers: &HeaderMap,
    peer: Option<SocketAddr>,
    trusted_hops: usize,
) -> Option<IpAddr> {
    let peer_ip = peer.map(|addr| addr.ip());

    if trusted_hops == 0 {
        // Directly exposed: the kernel-reported peer is the only trustworthy source, and
        // any XFF present is pure client input.
        return peer_ip;
    }

    let forwarded: Vec<IpAddr> = headers
        .get_all(X_FORWARDED_FOR)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .filter_map(|entry| parse_entry(entry.trim()))
        .collect();

    // The last `trusted_hops - 1` entries were appended by intermediate proxies we
    // control; the peer is the final hop. The entry immediately to the left of our own
    // proxies is the furthest address we still have grounds to believe.
    let skip_from_right = trusted_hops.saturating_sub(1);
    if forwarded.len() > skip_from_right {
        return Some(forwarded[forwarded.len() - 1 - skip_from_right]);
    }

    // Fewer entries than configured hops: the request did not arrive through the expected
    // chain. Fall back to the peer rather than trusting a short, possibly forged header.
    peer_ip
}

/// Parses one `X-Forwarded-For` entry, tolerating the `ip:port` form some proxies emit
/// and the bracketed IPv6 form.
fn parse_entry(entry: &str) -> Option<IpAddr> {
    if entry.is_empty() {
        return None;
    }
    if let Ok(ip) = entry.parse::<IpAddr>() {
        return Some(ip);
    }
    if let Ok(addr) = entry.parse::<SocketAddr>() {
        return Some(addr.ip());
    }
    // `[::1]` without a port.
    entry
        .strip_prefix('[')
        .and_then(|rest| rest.strip_suffix(']'))
        .and_then(|inner| inner.parse::<IpAddr>().ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers(value: &str) -> HeaderMap {
        let mut map = HeaderMap::new();
        if !value.is_empty() {
            map.insert(X_FORWARDED_FOR, value.parse().unwrap());
        }
        map
    }

    fn peer() -> Option<SocketAddr> {
        Some("10.0.0.9:5000".parse().unwrap())
    }

    #[test]
    fn with_no_proxy_the_header_is_ignored_entirely() {
        // The attack: a directly-exposed service that trusts XFF lets any client claim
        // any address, which defeats every IP-keyed limit at once.
        let resolved = resolve(&headers("1.2.3.4, 5.6.7.8"), peer(), 0);
        assert_eq!(resolved, Some("10.0.0.9".parse::<IpAddr>().unwrap()));
    }

    #[test]
    fn with_one_proxy_the_rightmost_entry_wins() {
        // Our single proxy appended the real client address at the right; everything to
        // its left is client-supplied padding.
        let resolved = resolve(&headers("1.2.3.4, 203.0.113.7"), peer(), 1);
        assert_eq!(resolved, Some("203.0.113.7".parse::<IpAddr>().unwrap()));
    }

    #[test]
    fn a_forged_prefix_cannot_change_the_answer() {
        let honest = resolve(&headers("203.0.113.7"), peer(), 1);
        let padded = resolve(
            &headers("9.9.9.9, 8.8.8.8, 7.7.7.7, 203.0.113.7"),
            peer(),
            1,
        );
        assert_eq!(
            honest, padded,
            "padding the header must not move the resolved address"
        );
    }

    #[test]
    fn with_two_proxies_we_step_one_further_left() {
        // chain: client -> edge -> internal -> us. The edge appended the client, the
        // internal appended the edge, so the client is second from the right.
        let resolved = resolve(&headers("203.0.113.7, 172.16.0.2"), peer(), 2);
        assert_eq!(resolved, Some("203.0.113.7".parse::<IpAddr>().unwrap()));
    }

    #[test]
    fn a_header_shorter_than_the_configured_chain_falls_back_to_the_peer() {
        // The request did not come through the expected proxies, so the header is not
        // evidence of anything.
        let resolved = resolve(&headers("1.2.3.4"), peer(), 3);
        assert_eq!(resolved, Some("10.0.0.9".parse::<IpAddr>().unwrap()));
    }

    #[test]
    fn entries_split_across_repeated_headers_are_all_considered() {
        let mut map = HeaderMap::new();
        map.append(X_FORWARDED_FOR, "1.2.3.4".parse().unwrap());
        map.append(X_FORWARDED_FOR, "203.0.113.7".parse().unwrap());
        assert_eq!(
            resolve(&map, peer(), 1),
            Some("203.0.113.7".parse::<IpAddr>().unwrap())
        );
    }

    #[test]
    fn ipv6_and_port_suffixed_forms_are_understood() {
        assert_eq!(
            parse_entry("[2001:db8::1]:443"),
            Some("2001:db8::1".parse::<IpAddr>().unwrap())
        );
        assert_eq!(
            parse_entry("[2001:db8::1]"),
            Some("2001:db8::1".parse::<IpAddr>().unwrap())
        );
        assert_eq!(
            parse_entry("192.0.2.1:8080"),
            Some("192.0.2.1".parse::<IpAddr>().unwrap())
        );
        assert_eq!(parse_entry("not-an-address"), None);
        assert_eq!(parse_entry(""), None);
    }

    #[test]
    fn garbage_entries_do_not_shift_the_index() {
        // A junk entry must be dropped, not counted as a hop, or an attacker could
        // shift which entry we read by inserting rubbish.
        let resolved = resolve(&headers("junk, 203.0.113.7"), peer(), 1);
        assert_eq!(resolved, Some("203.0.113.7".parse::<IpAddr>().unwrap()));
    }
}
