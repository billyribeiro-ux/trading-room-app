//! Environment-driven configuration.
//!
//! Every value is validated at startup rather than at first use: an SFU that boots with an
//! unroutable announced address or an inverted port range looks healthy and then fails only when a
//! participant tries to connect, which is the worst time to find out.

use crate::session::{MAX_TRANSPORTS_PER_SESSION, PORTS_PER_TRANSPORT};
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use thiserror::Error;
use url::{Host, Url};

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("{key} must be set")]
    Missing { key: &'static str },
    #[error("{key} is not valid: {value}")]
    Invalid { key: &'static str, value: String },
    #[error("MEDIA_RTC_PORT_MIN ({min}) must be below MEDIA_RTC_PORT_MAX ({max})")]
    InvertedPortRange { min: u16, max: u16 },
    #[error("the RTC port range {min}-{max} has {available} ports, fewer than the {needed} needed for {workers} workers")]
    PortRangeTooSmall {
        min: u16,
        max: u16,
        available: u32,
        needed: u32,
        workers: usize,
    },
}

/// Each worker needs its own slice of the range, and a slice narrower than this cannot carry a
/// meaningful number of concurrent transports.
const MIN_PORTS_PER_WORKER: u32 = 100;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    /// Where the axum server listens for signalling.
    pub bind_address: String,
    /// The address peers are told to send RTP to. Behind NAT this is the public address, which is
    /// why it cannot be inferred from the listen address.
    pub announced_address: IpAddr,
    pub rtc_port_min: u16,
    pub rtc_port_max: u16,
    pub workers: usize,
    /// Ed25519 public key (base64) that admission grants are verified against.
    pub grant_public_key: Option<String>,
    /// Exact canonical browser origin allowed to open signalling WebSockets. Required in
    /// grant-enforcing deployments; optional only in explicitly anonymous local mode.
    pub allowed_origin: Option<String>,
}

fn var(key: &'static str) -> Option<String> {
    std::env::var(key)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

fn parse<T: std::str::FromStr>(key: &'static str, fallback: T) -> Result<T, ConfigError> {
    match var(key) {
        None => Ok(fallback),
        Some(value) => value
            .parse()
            .map_err(|_| ConfigError::Invalid { key, value }),
    }
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let workers: usize = parse("MEDIA_WORKERS", default_workers())?;
        if workers == 0 {
            return Err(ConfigError::Invalid {
                key: "MEDIA_WORKERS",
                value: "0".into(),
            });
        }

        let rtc_port_min: u16 = parse("MEDIA_RTC_PORT_MIN", 40000)?;
        let rtc_port_max: u16 = parse("MEDIA_RTC_PORT_MAX", 49999)?;
        let announced_address: IpAddr =
            parse("MEDIA_ANNOUNCED_ADDRESS", IpAddr::V4(Ipv4Addr::LOCALHOST))?;

        let config = Self {
            bind_address: var("MEDIA_BIND_ADDRESS").unwrap_or_else(|| "0.0.0.0:4443".into()),
            announced_address,
            rtc_port_min,
            rtc_port_max,
            workers,
            grant_public_key: var("MEDIA_GRANT_PUBLIC_KEY"),
            allowed_origin: var("MEDIA_ALLOWED_ORIGIN"),
        };
        config.validate()?;
        Ok(config)
    }

    fn validate(&self) -> Result<(), ConfigError> {
        if self.rtc_port_min >= self.rtc_port_max {
            return Err(ConfigError::InvertedPortRange {
                min: self.rtc_port_min,
                max: self.rtc_port_max,
            });
        }

        let available = u32::from(self.rtc_port_max - self.rtc_port_min) + 1;
        let needed = MIN_PORTS_PER_WORKER * self.workers as u32;
        if available < needed {
            return Err(ConfigError::PortRangeTooSmall {
                min: self.rtc_port_min,
                max: self.rtc_port_max,
                available,
                needed,
                workers: self.workers,
            });
        }

        if let Some(origin) = &self.allowed_origin {
            validate_origin(origin)?;
        }

        self.bind_socket_address()?;

        Ok(())
    }

    /// The listen address as a parsed socket address.
    ///
    /// `TcpListener::bind` also accepts a hostname and resolves it, but the loopback-development
    /// exemption is decided by whether this address is loopback. Accepting a form that only some
    /// of the startup path understands would let the exemption be withheld while the failure is
    /// reported against a different environment variable, so a hostname is rejected here, under
    /// its own key, before any worker is spawned. Every checked-in deployment value is already a
    /// literal `IP:port`.
    pub fn bind_socket_address(&self) -> Result<SocketAddr, ConfigError> {
        self.bind_address.parse().map_err(|_| ConfigError::Invalid {
            key: "MEDIA_BIND_ADDRESS",
            value: self.bind_address.clone(),
        })
    }

    /// How many signalling sockets this SFU will hold open at once.
    ///
    /// Not a tuning knob - it is the RTC port range restated as a number of peers. Capping
    /// transports per session (`session::MAX_TRANSPORTS_PER_SESSION`) bounds what one peer can take
    /// but says nothing about how many peers there are. Even with the separate per-identity ceiling,
    /// the global ceiling is required because many identities can connect concurrently. Without it
    /// the scarce resource is drained by *concurrent sockets* instead of by any single one. The
    /// symptom is the worst kind: everyone connects, everyone negotiates, and
    /// the participants who happen to create a transport last are told "transport creation failed"
    /// while the service reports itself healthy.
    ///
    /// The arithmetic is the worst case, deliberately: every peer holding its full allowance of
    /// transports, each binding one UDP and one TCP socket. That is roughly twice as conservative
    /// as reality - the captured client builds two transports, not four (bytes 1079380, 1080880) -
    /// and refusing a peer at the door with a 503 it can retry is a far better failure than
    /// admitting it and running out of ports underneath it.
    ///
    /// Never zero: `validate` already guarantees 100 ports per worker, but a floor of one keeps
    /// this total rather than merely small if that ever changes.
    #[must_use]
    pub fn max_peers(&self) -> usize {
        let available = usize::from(self.rtc_port_max - self.rtc_port_min) + 1;
        let per_peer = MAX_TRANSPORTS_PER_SESSION * PORTS_PER_TRANSPORT;
        (available / per_peer).max(1)
    }

    /// The slice of the RTC range belonging to one worker. Workers must not share ports.
    pub fn port_range_for(&self, worker_index: usize) -> (u16, u16) {
        let available = u32::from(self.rtc_port_max - self.rtc_port_min) + 1;
        let per_worker = available / self.workers as u32;
        let start = u32::from(self.rtc_port_min) + per_worker * worker_index as u32;
        let end = if worker_index + 1 == self.workers {
            u32::from(self.rtc_port_max)
        } else {
            start + per_worker - 1
        };
        (start as u16, end as u16)
    }
}

fn validate_origin(value: &str) -> Result<(), ConfigError> {
    let parsed = Url::parse(value).map_err(|_| ConfigError::Invalid {
        key: "MEDIA_ALLOWED_ORIGIN",
        value: value.to_owned(),
    })?;

    if !matches!(parsed.scheme(), "http" | "https")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.host().is_none()
        || parsed.host_str().is_some_and(|host| host.contains('*'))
        || parsed.path() != "/"
        || parsed.query().is_some()
        || parsed.fragment().is_some()
        || parsed.origin().ascii_serialization() != value
        || (parsed.scheme() == "http" && !is_loopback_host(&parsed))
    {
        return Err(ConfigError::Invalid {
            key: "MEDIA_ALLOWED_ORIGIN",
            value: value.to_owned(),
        });
    }

    Ok(())
}

fn is_loopback_host(url: &Url) -> bool {
    match url.host() {
        Some(Host::Domain(host)) => host.eq_ignore_ascii_case("localhost"),
        Some(Host::Ipv4(address)) => address.is_loopback(),
        Some(Host::Ipv6(address)) => address.is_loopback(),
        None => false,
    }
}

fn default_workers() -> usize {
    std::thread::available_parallelism()
        .map(|count| count.get())
        .unwrap_or(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(workers: usize, min: u16, max: u16) -> Config {
        Config {
            bind_address: "0.0.0.0:4443".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: min,
            rtc_port_max: max,
            workers,
            grant_public_key: None,
            allowed_origin: Some("https://app.example.test".into()),
        }
    }

    #[test]
    fn rejects_a_bind_address_that_is_not_a_literal_socket_address() {
        // `TcpListener::bind` would resolve these, but the loopback-development exemption is
        // decided by a parse, so an unparsed form must fail under its own key rather than
        // surface later as a MEDIA_ANNOUNCED_ADDRESS error.
        for value in ["localhost:4443", "media.internal:4443", "127.0.0.1", ""] {
            let mut invalid = config(1, 40000, 49999);
            invalid.bind_address = value.into();

            assert_eq!(
                invalid.validate(),
                Err(ConfigError::Invalid {
                    key: "MEDIA_BIND_ADDRESS",
                    value: value.into(),
                }),
                "{value} must be rejected as a bind address"
            );
        }
    }

    #[test]
    fn accepts_literal_ipv4_and_ipv6_bind_addresses() {
        for value in ["0.0.0.0:4443", "127.0.0.1:4443", "[::1]:4443"] {
            let mut valid = config(1, 40000, 49999);
            valid.bind_address = value.into();

            assert_eq!(valid.validate(), Ok(()), "{value} must be accepted");
            assert_eq!(
                valid
                    .bind_socket_address()
                    .map(|address| address.ip().is_loopback()),
                Ok(value != "0.0.0.0:4443")
            );
        }
    }

    #[test]
    fn rejects_an_inverted_port_range() {
        let err = config(1, 50000, 40000).validate().unwrap_err();
        assert_eq!(
            err,
            ConfigError::InvertedPortRange {
                min: 50000,
                max: 40000
            }
        );
    }

    #[test]
    fn rejects_a_range_too_small_for_the_worker_count() {
        let err = config(8, 40000, 40099).validate().unwrap_err();
        assert!(matches!(
            err,
            ConfigError::PortRangeTooSmall { workers: 8, .. }
        ));
    }

    #[test]
    fn accepts_a_range_that_fits() {
        assert!(config(8, 40000, 49999).validate().is_ok());
    }

    #[test]
    fn accepts_one_canonical_browser_origin() {
        let mut config = config(1, 40000, 40199);
        config.allowed_origin = Some("http://localhost:5173".into());
        assert!(config.validate().is_ok());

        config.allowed_origin = Some("http://127.0.0.1:5173".into());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn rejects_malformed_or_non_origin_browser_urls() {
        for value in [
            "not an origin",
            "ftp://app.example.test",
            "https://app.example.test/",
            "https://app.example.test/path",
            "https://user@app.example.test",
            "https://APP.example.test",
            "http://app.example.test",
        ] {
            let mut config = config(1, 40000, 40199);
            config.allowed_origin = Some(value.into());
            assert!(config.validate().is_err(), "accepted {value:?}");
        }
    }

    /// The connection ceiling is the port range restated, so it has to move with it - and it must
    /// never be zero, or the SFU validates its configuration and then refuses every peer.
    #[test]
    fn the_peer_ceiling_follows_the_port_range() {
        // 10,000 ports, 8 per peer at the worst case.
        assert_eq!(config(4, 40000, 49999).max_peers(), 1250);
        // The smallest range `validate` accepts for one worker.
        let smallest = config(1, 40000, 40099);
        assert!(smallest.validate().is_ok());
        assert_eq!(smallest.max_peers(), 12);
        assert!(
            smallest.max_peers() > 0,
            "a valid configuration must admit at least one peer"
        );
    }

    /// Two workers sharing a port would bind-conflict at transport creation, not at startup.
    #[test]
    fn worker_port_ranges_never_overlap_and_cover_the_whole_range() {
        let config = config(4, 40000, 49999);
        let ranges: Vec<_> = (0..config.workers)
            .map(|i| config.port_range_for(i))
            .collect();

        for window in ranges.windows(2) {
            assert!(
                window[0].1 < window[1].0,
                "ranges {:?} and {:?} overlap",
                window[0],
                window[1]
            );
        }
        assert_eq!(ranges.first().unwrap().0, 40000);
        assert_eq!(ranges.last().unwrap().1, 49999);
    }
}
