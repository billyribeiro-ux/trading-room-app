//! Configuration, read once at startup.
//!
//! Two rules, both borrowed from `tradingroom-media`'s `config.rs`:
//!
//! 1. Every fallible step happens **before** the listener binds, so a misconfigured
//!    deployment exits non-zero naming the variable instead of accepting traffic and
//!    failing per-request.
//! 2. `validate()` is a separate method from `from_env()`, so tests can build a `Config`
//!    literal and exercise validation without touching the process environment.
//!
//! Missing variables are reported **all at once**. Discovering one missing name per
//! restart is a miserable way to bring up a deployment.

use std::env::VarError;
use std::time::Duration;
use url::{Host, Url};

use crate::limits;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ConfigError {
    #[error("missing required environment variable(s): {0}")]
    Missing(String),
    #[error("environment variable {key} has invalid value {value:?}: {reason}")]
    Invalid {
        key: &'static str,
        value: String,
        reason: &'static str,
    },
}

/// Reads a variable, treating empty and whitespace-only as absent. An empty string in a
/// deployment UI almost always means "I did not set this", not "I set this to nothing".
/// Marker for a variable that is set but not valid UTF-8. Chosen so it can never be a
/// legitimate value for any setting, and so validation reports the variable by name.
const NOT_UNICODE: &str = "\u{fffd}<not-utf8>";

fn var(key: &'static str) -> Option<String> {
    match std::env::var(key) {
        Ok(value) if !value.trim().is_empty() => Some(value),
        Ok(_) | Err(VarError::NotPresent) => None,
        // A non-UTF-8 value is a configuration error, not an absence. Returning a
        // sentinel string would let it flow onward and fail somewhere confusing, so it
        // is surfaced here as a value that cannot pass validation, with the variable
        // named.
        Err(VarError::NotUnicode(_)) => Some(NOT_UNICODE.to_string()),
    }
}

fn parse<T: std::str::FromStr>(
    key: &'static str,
    fallback: T,
    reason: &'static str,
) -> Result<T, ConfigError> {
    match var(key) {
        None => Ok(fallback),
        Some(value) => value
            .parse::<T>()
            .map_err(|_| ConfigError::Invalid { key, value, reason }),
    }
}

// Deliberately no `Debug`: this value owns the database URL and both private
// signing seeds. A derived formatter would turn an innocent diagnostic into a
// credential leak.
#[derive(Clone, PartialEq, Eq)]
pub struct Config {
    /// Runtime credentials. MUST be the restricted, membership-free `tradingroom_app` role so
    /// row-level security actually applies. Enforced at startup, not by convention - see
    /// [`crate::db::Db::assert_runtime_role_is_restricted`].
    ///
    /// **This said `ptr_clone_app` until 2026-08-31, and by then the code REFUSED that role.**
    /// `0009_rename_runtime_roles.sql` renamed it, `db::EXPECTED_RUNTIME_ROLE` is
    /// `tradingroom_app`, and `the_immutable_authentication_identity_is_required_and_parsed_exactly`
    /// asserts that a connection authenticating as `ptr_clone_app` is rejected — so this doc comment
    /// named the one role the startup check exists to turn away.
    ///
    /// The old name is still correct elsewhere in this tree and that is what made the staleness hard
    /// to see: `docker/postgres/10-provision-roles.sh` must keep creating `ptr_clone_app` or
    /// migrations `0001`–`0006` cannot grant to it, and `db/mod.rs` uses it as a NEGATIVE fixture.
    /// `ops/naming-provenance.md` is the mapping; both names exist on purpose.
    pub database_url: String,
    pub bind_address: String,
    pub db_pool_max: u32,
    pub db_acquire_timeout: Duration,
    pub request_timeout: Duration,
    /// Number of reverse proxies in front of this process. Determines how many
    /// `X-Forwarded-For` entries to strip from the right. Wrong values are a security
    /// problem in both directions, so there is no default guess: see [`Self::validate`].
    pub trusted_proxy_hops: usize,
    /// The one browser origin allowed to exercise cookie-authenticated mutations and
    /// room-event WebSockets. This is an origin (`scheme://host[:port]`), not a URL: no path,
    /// query, fragment, credentials, wildcard or trailing slash is accepted.
    pub trusted_web_origin: String,
    /// Ed25519 signing seed for access tokens: exactly 32 raw secret bytes encoded with
    /// standard base64. Distinct from the media grant key so a token from one system can
    /// never be replayed against the other.
    pub auth_token_private_key: String,
    /// Ed25519 signing seed for media grants: exactly 32 raw secret bytes encoded with
    /// standard base64. The SFU holds only the public half (`MEDIA_GRANT_PUBLIC_KEY`), so
    /// it can check a grant but not mint one.
    ///
    /// Deliberately a *different* key from `auth_token_private_key`. Sharing one would make
    /// an access token a structurally valid grant, leaving only the disjoint claim sets
    /// between the two systems; separate keys make the separation arithmetic.
    pub media_grant_private_key: String,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let mut missing = Vec::new();

        let database_url = var("DATABASE_URL");
        if database_url.is_none() {
            missing.push("DATABASE_URL");
        }
        let auth_token_private_key = var("AUTH_TOKEN_PRIVATE_KEY");
        if auth_token_private_key.is_none() {
            missing.push("AUTH_TOKEN_PRIVATE_KEY");
        }
        let media_grant_private_key = var("MEDIA_GRANT_PRIVATE_KEY");
        if media_grant_private_key.is_none() {
            missing.push("MEDIA_GRANT_PRIVATE_KEY");
        }
        let trusted_web_origin = var("TRUSTED_WEB_ORIGIN");
        if trusted_web_origin.is_none() {
            missing.push("TRUSTED_WEB_ORIGIN");
        }

        if !missing.is_empty() {
            return Err(ConfigError::Missing(missing.join(", ")));
        }

        let config = Self {
            database_url: database_url.expect("checked above"),
            auth_token_private_key: auth_token_private_key.expect("checked above"),
            media_grant_private_key: media_grant_private_key.expect("checked above"),
            trusted_web_origin: trusted_web_origin.expect("checked above"),
            bind_address: var("BIND_ADDRESS").unwrap_or_else(|| "127.0.0.1:8080".into()),
            db_pool_max: parse(
                "DB_POOL_MAX",
                limits::DB_POOL_MAX,
                "expected a positive integer",
            )?,
            db_acquire_timeout: Duration::from_secs(parse(
                "DB_ACQUIRE_TIMEOUT_SECONDS",
                limits::DB_ACQUIRE_TIMEOUT.as_secs(),
                "expected a number of seconds",
            )?),
            request_timeout: Duration::from_secs(parse(
                "REQUEST_TIMEOUT_SECONDS",
                limits::REQUEST_TIMEOUT.as_secs(),
                "expected a number of seconds",
            )?),
            trusted_proxy_hops: parse(
                "TRUSTED_PROXY_HOPS",
                0,
                "expected a non-negative integer number of proxies",
            )?,
        };

        config.validate()?;
        Ok(config)
    }

    /// Separate from `from_env` so tests can validate a literal.
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.db_pool_max == 0 {
            return Err(ConfigError::Invalid {
                key: "DB_POOL_MAX",
                value: self.db_pool_max.to_string(),
                reason: "a pool of zero connections can never serve a request",
            });
        }
        // Managed Postgres tiers cap total connections; several instances each holding a
        // large pool is the usual way to exhaust them.
        if self.db_pool_max > 100 {
            return Err(ConfigError::Invalid {
                key: "DB_POOL_MAX",
                value: self.db_pool_max.to_string(),
                reason: "implausibly large; managed Postgres connection budgets are shared",
            });
        }
        if self.db_acquire_timeout < Duration::from_secs(1)
            || self.db_acquire_timeout > limits::DB_ACQUIRE_TIMEOUT
        {
            return Err(ConfigError::Invalid {
                key: "DB_ACQUIRE_TIMEOUT_SECONDS",
                value: self.db_acquire_timeout.as_secs().to_string(),
                reason: "expected 1 to 5 seconds, inclusive",
            });
        }
        if self.request_timeout < Duration::from_secs(1)
            || self.request_timeout > limits::REQUEST_TIMEOUT
        {
            return Err(ConfigError::Invalid {
                key: "REQUEST_TIMEOUT_SECONDS",
                value: self.request_timeout.as_secs().to_string(),
                reason: "expected 1 to 30 seconds, inclusive",
            });
        }
        if !self.database_url.starts_with("postgres://")
            && !self.database_url.starts_with("postgresql://")
        {
            return Err(ConfigError::Invalid {
                key: "DATABASE_URL",
                value: "<redacted>".into(),
                reason: "expected a postgres:// connection string",
            });
        }
        // One key signing both systems would mean an access token is a structurally valid
        // media grant. The claim sets differ, so it would still be refused - but by parsing
        // rather than by cryptography, which is a much thinner margin than it looks.
        if self.auth_token_private_key.trim() == self.media_grant_private_key.trim() {
            return Err(ConfigError::Invalid {
                key: "MEDIA_GRANT_PRIVATE_KEY",
                value: "<redacted>".into(),
                reason: "must differ from AUTH_TOKEN_PRIVATE_KEY; one key for both token \
                         systems removes the cryptographic separation between them",
            });
        }
        // Trusting a header from an unknown number of hops is how client IPs get spoofed,
        // which in turn defeats every IP-keyed rate limit.
        if self.trusted_proxy_hops > 4 {
            return Err(ConfigError::Invalid {
                key: "TRUSTED_PROXY_HOPS",
                value: self.trusted_proxy_hops.to_string(),
                reason: "more than four proxy hops is almost certainly a misconfiguration",
            });
        }
        validate_origin("TRUSTED_WEB_ORIGIN", &self.trusted_web_origin)?;
        Ok(())
    }
}

/// Accepts only a canonical HTTP(S) origin serialization.
///
/// Comparing the configured string directly with the browser's `Origin` header is the security
/// boundary. Requiring the URL parser's canonical origin representation here prevents two strings
/// that mean the same place (`https://EXAMPLE.test`, a default port, or a trailing slash) from
/// turning into an operator-visible outage after startup. HTTP is retained for loopback/local
/// development; deployed browser origins must use HTTPS.
fn validate_origin(key: &'static str, value: &str) -> Result<(), ConfigError> {
    let parsed = Url::parse(value).map_err(|_| ConfigError::Invalid {
        key,
        value: value.to_owned(),
        reason: "expected one canonical http(s) origin such as https://app.example.com",
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
            key,
            value: value.to_owned(),
            reason: "expected one canonical http(s) origin with no path, credentials, query, fragment, wildcard or trailing slash",
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

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> Config {
        Config {
            database_url: "postgres://user:pw@localhost/db".into(),
            auth_token_private_key: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=".into(),
            media_grant_private_key: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".into(),
            bind_address: "127.0.0.1:8080".into(),
            db_pool_max: 10,
            db_acquire_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(30),
            trusted_proxy_hops: 0,
            trusted_web_origin: "https://app.example.test".into(),
        }
    }

    #[test]
    fn a_valid_config_passes() {
        assert_eq!(valid().validate(), Ok(()));
    }

    #[test]
    fn an_empty_pool_is_refused() {
        let config = Config {
            db_pool_max: 0,
            ..valid()
        };
        assert!(matches!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "DB_POOL_MAX",
                ..
            })
        ));
    }

    #[test]
    fn a_zero_database_acquire_timeout_is_refused() {
        let config = Config {
            db_acquire_timeout: Duration::ZERO,
            ..valid()
        };
        assert_eq!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "DB_ACQUIRE_TIMEOUT_SECONDS",
                value: "0".into(),
                reason: "expected 1 to 5 seconds, inclusive",
            })
        );
    }

    #[test]
    fn the_maximum_database_acquire_timeout_is_accepted() {
        let config = Config {
            db_acquire_timeout: limits::DB_ACQUIRE_TIMEOUT,
            ..valid()
        };

        assert_eq!(config.validate(), Ok(()));
    }

    #[test]
    fn a_database_acquire_timeout_above_the_maximum_is_refused_by_name() {
        let config = Config {
            db_acquire_timeout: limits::DB_ACQUIRE_TIMEOUT + Duration::from_secs(1),
            ..valid()
        };

        assert_eq!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "DB_ACQUIRE_TIMEOUT_SECONDS",
                value: "6".into(),
                reason: "expected 1 to 5 seconds, inclusive",
            })
        );
    }

    #[test]
    fn a_zero_request_timeout_is_refused() {
        let config = Config {
            request_timeout: Duration::ZERO,
            ..valid()
        };
        assert_eq!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "REQUEST_TIMEOUT_SECONDS",
                value: "0".into(),
                reason: "expected 1 to 30 seconds, inclusive",
            })
        );
    }

    #[test]
    fn the_maximum_request_timeout_is_accepted() {
        let config = Config {
            request_timeout: limits::REQUEST_TIMEOUT,
            ..valid()
        };

        assert_eq!(config.validate(), Ok(()));
    }

    #[test]
    fn a_request_timeout_above_the_maximum_is_refused_by_name() {
        let config = Config {
            request_timeout: limits::REQUEST_TIMEOUT + Duration::from_secs(1),
            ..valid()
        };

        assert_eq!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "REQUEST_TIMEOUT_SECONDS",
                value: "31".into(),
                reason: "expected 1 to 30 seconds, inclusive",
            })
        );
    }

    #[test]
    fn a_non_postgres_url_is_refused() {
        // Guards against pointing the new backend at the retired SQLite file.
        let config = Config {
            database_url: "sqlite://.data/proroom.sqlite".into(),
            ..valid()
        };
        assert!(matches!(
            config.validate(),
            Err(ConfigError::Invalid {
                key: "DATABASE_URL",
                ..
            })
        ));
    }

    #[test]
    fn the_database_url_never_appears_in_an_error() {
        let config = Config {
            database_url: "mysql://user:hunter2@host/db".into(),
            ..valid()
        };
        let message = config.validate().unwrap_err().to_string();
        assert!(
            !message.contains("hunter2"),
            "connection strings carry passwords and must never be echoed: {message}"
        );
    }

    #[test]
    fn an_implausible_proxy_hop_count_is_refused() {
        let config = Config {
            trusted_proxy_hops: 9,
            ..valid()
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn a_canonical_browser_origin_is_accepted() {
        let config = Config {
            trusted_web_origin: "http://localhost:5173".into(),
            ..valid()
        };
        assert_eq!(config.validate(), Ok(()));

        let ip_loopback = Config {
            trusted_web_origin: "http://127.0.0.1:5173".into(),
            ..valid()
        };
        assert_eq!(ip_loopback.validate(), Ok(()));
    }

    #[test]
    fn malformed_or_non_origin_browser_urls_are_refused() {
        for value in [
            "",
            "app.example.test",
            "ftp://app.example.test",
            "https://app.example.test/",
            "https://app.example.test/path",
            "https://user@app.example.test",
            "https://*.example.test",
            "https://APP.example.test",
            "http://app.example.test",
        ] {
            let config = Config {
                trusted_web_origin: value.into(),
                ..valid()
            };
            assert!(config.validate().is_err(), "accepted {value:?}");
        }
    }
}
