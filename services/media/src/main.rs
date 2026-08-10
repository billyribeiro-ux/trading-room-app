//! The `tradingroom-media` binary: read the environment, build the pool, serve, shut down cleanly.
//!
//! # Failing at startup instead of at first use
//!
//! Every fallible step here happens before the listener is bound, and every failure exits non-zero
//! with a message naming the environment variable at fault. That ordering is the point. An SFU that
//! boots with an unroutable announced address, an inverted port range or the wrong grant key looks
//! completely healthy - it accepts connections, `/health` says `ok`, the process stays up - and
//! fails only when a participant tries to join, which is both the worst time to find out and the
//! hardest place to see it. `Config::validate` and `GrantVerifier::new` already refuse those
//! configurations; this file's job is to make the refusal reach an operator rather than a log line
//! nobody is reading yet.
//!
//! The message goes to stderr *and* to `tracing`, because the most likely startup failure is one
//! that happens before, or instead of, a working log pipeline.
//!
//! # Environment
//!
//! | variable                  | default                    | meaning                                        |
//! |---------------------------|----------------------------|------------------------------------------------|
//! | `MEDIA_BIND_ADDRESS`      | `0.0.0.0:4443`             | where signalling listens                        |
//! | `MEDIA_ANNOUNCED_ADDRESS` | `127.0.0.1`                | the address peers send RTP to (public, not bind)|
//! | `MEDIA_RTC_PORT_MIN/MAX`  | `40000` / `49999`          | the RTC range, sliced per worker                |
//! | `MEDIA_WORKERS`           | available parallelism      | mediasoup worker threads                        |
//! | `MEDIA_GRANT_PUBLIC_KEY`  | -                          | Ed25519 public key, raw 32 bytes, padded base64 |
//! | `MEDIA_ALLOWED_ORIGIN`    | -                          | exact browser origin allowed to open `/ws`     |
//! | `MEDIA_ALLOW_ANONYMOUS`   | unset                      | development only; see below                     |
//! | `MEDIA_PEER_PING_SECONDS` | `20`                       | how often each peer is pinged for liveness      |
//! | `MEDIA_PEER_SILENCE_SECONDS` | `60`                    | silence after which a peer's socket is closed   |
//! | `RUST_LOG`                | `info`                     | tracing filter                                  |
//!
//! `MEDIA_ALLOW_ANONYMOUS` is read here rather than added to [`Config`] deliberately: it is not a
//! media parameter but an admission one, and it is the only knob in the service that can weaken a
//! security property. Keeping it out of the config struct means it cannot be set by accident
//! through a config file or a struct-update expression - it has to be spelled out in the
//! environment, where a deployment review can see it. It must be exactly `1` or `true`; any other
//! value is a startup failure rather than a silent "that isn't true, so admission stays on", because
//! a typo in the *other* direction (`MEDIA_ALLOW_ANONYMOUS=yes` meaning to enable it) is the reading
//! that matters here. Setting it alongside a configured key is refused by `GrantVerifier::new`.
//! Grant-enforcing mode also requires `MEDIA_ALLOWED_ORIGIN`. Anonymous local mode may leave it
//! unset, in which case Origin is deliberately not checked; if it is set, the same exact-origin
//! policy is applied even in anonymous mode. Anonymous mode is accepted only when both the
//! signaling bind and announced media address are loopback.

use std::{net::IpAddr, sync::Arc};
use thiserror::Error;
use tokio::net::TcpListener;
use tradingroom_media::config::{Config, ConfigError};
use tradingroom_media::grant::{Admission, GrantConfigError, GrantVerifier};
use tradingroom_media::router_registry::RouterRegistry;
use tradingroom_media::server::{self, AppState};
use tradingroom_media::worker_pool::{PoolError, WorkerPool};

#[derive(Debug, Error)]
enum StartupError {
    #[error("invalid configuration: {0}")]
    Config(#[from] ConfigError),
    #[error("invalid admission configuration: {0}")]
    Admission(#[from] GrantConfigError),
    #[error(
        "MEDIA_ALLOW_ANONYMOUS must be exactly `1` or `true` if it is set at all, not {value:?}: \
         refusing to guess whether admission was meant to be off"
    )]
    Anonymous { value: String },
    #[error("could not start the mediasoup worker pool: {0}")]
    Pool(#[from] PoolError),
    #[error("could not bind {address}: {source}")]
    Bind {
        address: String,
        #[source]
        source: std::io::Error,
    },
    #[error("the server stopped with an error: {0}")]
    Serve(#[source] std::io::Error),
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    if let Err(error) = run().await {
        // Both, on purpose: stderr is what an operator watching a failed deploy actually sees, and
        // the tracing line is what a log pipeline collects.
        eprintln!("tradingroom-media failed to start: {error}");
        tracing::error!(%error, "tradingroom-media failed to start");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), StartupError> {
    let config = Config::from_env()?;
    let admission = admission_from_env()?;
    validate_origin_policy(&config, admission)?;
    validate_announced_address_policy(&config, admission)?;

    tracing::info!(
        bind_address = %config.bind_address,
        announced_address = %config.announced_address,
        rtc_ports = %format!("{}-{}", config.rtc_port_min, config.rtc_port_max),
        workers = config.workers,
        "configuration validated"
    );

    // Before the workers: a bad key must not cost a pool of C++ threads to discover.
    let verifier = Arc::new(GrantVerifier::from_config(&config, admission)?);

    let pool = WorkerPool::new(config.clone()).await?;
    let registry = RouterRegistry::new(Arc::clone(&pool));
    let state = AppState::new(pool, registry, config.clone(), verifier);

    let listener = TcpListener::bind(&config.bind_address)
        .await
        .map_err(|source| StartupError::Bind {
            address: config.bind_address.clone(),
            source,
        })?;

    server::serve(state, listener, shutdown_signal())
        .await
        .map_err(StartupError::Serve)
}

fn validate_origin_policy(config: &Config, admission: Admission) -> Result<(), ConfigError> {
    if admission == Admission::RequireGrant && config.allowed_origin.is_none() {
        return Err(ConfigError::Missing {
            key: "MEDIA_ALLOWED_ORIGIN",
        });
    }
    Ok(())
}

/// An externally bound, grant-enforcing service must announce an address that an Internet peer can
/// actually route to. The one narrow exception is an entirely loopback-bound development process:
/// it may enforce real signed grants while announcing loopback, so the checked-in local API-to-SFU
/// contract remains testable without weakening any externally reachable deployment. Explicitly
/// anonymous development is more restrictive still: both its signaling listener and announced
/// address must be loopback, so the admission bypass cannot expose a network-reachable SFU.
///
/// `std::net::IpAddr::is_global` is still unstable on the repository-pinned Rust 1.97.1 toolchain.
/// Keep the conservative special-use ranges visible here and regression-tested instead of relying
/// on a nightly API or accepting an address merely because it parses. The policy follows the IANA
/// IPv4/IPv6 special-purpose registries and deliberately rejects an entire special-purpose parent
/// block when that is safer than admitting one of its narrow globally reachable exceptions:
/// <https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml>
/// <https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml>
fn validate_announced_address_policy(
    config: &Config,
    admission: Admission,
) -> Result<(), ConfigError> {
    // `Config::validate` already rejected a bind address that is not a literal `IP:port`, under
    // its own key, so this cannot silently withhold the exemption for an unparsed hostname.
    let bind_is_loopback = config.bind_socket_address()?.ip().is_loopback();
    let loopback_development = config.announced_address.is_loopback() && bind_is_loopback;

    if admission == Admission::AllowAnonymous && !bind_is_loopback {
        return Err(ConfigError::Invalid {
            key: "MEDIA_BIND_ADDRESS",
            value: config.bind_address.clone(),
        });
    }
    if admission == Admission::AllowAnonymous && !config.announced_address.is_loopback() {
        return Err(ConfigError::Invalid {
            key: "MEDIA_ANNOUNCED_ADDRESS",
            value: config.announced_address.to_string(),
        });
    }

    if admission == Admission::RequireGrant
        && !loopback_development
        && !is_publicly_routable(config.announced_address)
    {
        return Err(ConfigError::Invalid {
            key: "MEDIA_ANNOUNCED_ADDRESS",
            value: config.announced_address.to_string(),
        });
    }
    Ok(())
}

fn is_publicly_routable(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => {
            let [first, second, third, _] = address.octets();

            !(first == 0
                || first == 10
                || first == 127
                || first >= 224
                || (first == 100 && (64..=127).contains(&second))
                || (first == 169 && second == 254)
                || (first == 172 && (16..=31).contains(&second))
                || (first == 192 && second == 0 && third == 0)
                || (first == 192 && second == 0 && third == 2)
                || (first == 192 && second == 88 && third == 99)
                || (first == 192 && second == 168)
                || (first == 198 && (18..=19).contains(&second))
                || (first == 198 && second == 51 && third == 100)
                || (first == 203 && second == 0 && third == 113))
        }
        IpAddr::V6(address) => {
            let segments = address.segments();
            let is_global_unicast = (segments[0] & 0xe000) == 0x2000;
            let is_special_2001 = segments[0] == 0x2001 && segments[1] <= 0x01ff;
            let is_documentation_2001 = segments[0] == 0x2001 && segments[1] == 0x0db8;
            let is_deprecated_6to4 = segments[0] == 0x2002;
            let is_documentation_3fff = segments[0] == 0x3fff && (segments[1] & 0xf000) == 0;

            is_global_unicast
                && !is_special_2001
                && !is_documentation_2001
                && !is_deprecated_6to4
                && !is_documentation_3fff
        }
    }
}

fn admission_from_env() -> Result<Admission, StartupError> {
    match std::env::var("MEDIA_ALLOW_ANONYMOUS") {
        Err(_) => Ok(Admission::RequireGrant),
        Ok(value) => match value.trim() {
            "" => Ok(Admission::RequireGrant),
            "1" | "true" => Ok(Admission::AllowAnonymous),
            other => Err(StartupError::Anonymous {
                value: other.to_owned(),
            }),
        },
    }
}

/// Resolves on the first of ctrl-c or SIGTERM.
///
/// SIGTERM is the one that matters in production - it is what a container runtime, systemd and
/// Railway send, and without it the process is killed outright some seconds later with every room
/// still open. Ctrl-C is for the same path to be exercised in development.
async fn shutdown_signal() {
    let interrupt = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::error!(%error, "could not listen for ctrl-c");
            // Never resolving leaves the other arm of the select as the only way out, which is
            // better than treating a broken handler as a shutdown request.
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => {
                tracing::error!(%error, "could not listen for SIGTERM");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = interrupt => tracing::info!("ctrl-c received"),
        () = terminate => tracing::info!("SIGTERM received"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{Ipv4Addr, Ipv6Addr};

    const ENV_EXAMPLE: &str = include_str!("../../.env.example");

    fn example_value(key: &str) -> &str {
        ENV_EXAMPLE
            .lines()
            .find_map(|line| line.strip_prefix(&format!("{key}=")))
            .unwrap_or_else(|| panic!("services/.env.example must define {key}"))
    }

    fn config(allowed_origin: Option<&str>) -> Config {
        Config {
            bind_address: "127.0.0.1:4443".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: 40000,
            rtc_port_max: 40199,
            workers: 1,
            grant_public_key: None,
            allowed_origin: allowed_origin.map(str::to_owned),
            peer_ping_interval: std::time::Duration::from_secs(20),
            peer_silence_limit: std::time::Duration::from_secs(60),
        }
    }

    #[test]
    fn enforcing_admission_requires_an_allowed_origin() {
        assert_eq!(
            validate_origin_policy(&config(None), Admission::RequireGrant),
            Err(ConfigError::Missing {
                key: "MEDIA_ALLOWED_ORIGIN"
            })
        );
        assert_eq!(
            validate_origin_policy(
                &config(Some("https://app.example.test")),
                Admission::RequireGrant,
            ),
            Ok(())
        );
    }

    #[test]
    fn anonymous_local_mode_may_explicitly_omit_the_origin() {
        assert_eq!(
            validate_origin_policy(&config(None), Admission::AllowAnonymous),
            Ok(())
        );
    }

    #[test]
    fn externally_bound_grant_mode_rejects_non_public_announced_addresses() {
        for address in [
            "0.0.0.0".parse().unwrap(),
            "0.1.2.3".parse().unwrap(),
            IpAddr::V4(Ipv4Addr::LOCALHOST),
            "10.0.0.1".parse().unwrap(),
            "100.64.0.1".parse().unwrap(),
            "169.254.0.1".parse().unwrap(),
            "172.16.0.1".parse().unwrap(),
            "192.0.2.1".parse().unwrap(),
            "192.168.0.1".parse().unwrap(),
            "198.18.0.1".parse().unwrap(),
            "198.51.100.1".parse().unwrap(),
            "203.0.113.1".parse().unwrap(),
            "224.0.0.1".parse().unwrap(),
            "240.0.0.1".parse().unwrap(),
            "::".parse().unwrap(),
            IpAddr::V6(Ipv6Addr::LOCALHOST),
            "2001::1".parse().unwrap(),
            "2001:db8::1".parse().unwrap(),
            "2002::1".parse().unwrap(),
            "3fff::1".parse().unwrap(),
            "fc00::1".parse().unwrap(),
            "fe80::1".parse().unwrap(),
            "ff00::1".parse().unwrap(),
        ] {
            let mut config = config(Some("https://app.example.test"));
            config.bind_address = "0.0.0.0:4443".into();
            config.announced_address = address;
            assert_eq!(
                validate_announced_address_policy(&config, Admission::RequireGrant),
                Err(ConfigError::Invalid {
                    key: "MEDIA_ANNOUNCED_ADDRESS",
                    value: address.to_string(),
                }),
                "accepted non-public address {address}"
            );
        }
    }

    #[test]
    fn loopback_bound_grant_mode_accepts_loopback_for_local_contract_testing() {
        assert_eq!(
            validate_announced_address_policy(
                &config(Some("http://localhost:5173")),
                Admission::RequireGrant,
            ),
            Ok(())
        );
    }

    #[test]
    fn checked_in_env_example_preserves_the_signed_grant_startup_contract() {
        // Secrets are correctly blank in the committed example. Inject a fixed public fixture only
        // for validation, exactly where the README tells a developer to paste their derived key.
        assert_eq!(example_value("MEDIA_GRANT_PUBLIC_KEY"), "");
        assert_eq!(example_value("MEDIA_ALLOW_ANONYMOUS"), "");

        let config = Config {
            bind_address: example_value("MEDIA_BIND_ADDRESS").into(),
            announced_address: example_value("MEDIA_ANNOUNCED_ADDRESS")
                .parse()
                .expect("example announced address must parse"),
            rtc_port_min: example_value("MEDIA_RTC_PORT_MIN")
                .parse()
                .expect("example minimum RTC port must parse"),
            rtc_port_max: example_value("MEDIA_RTC_PORT_MAX")
                .parse()
                .expect("example maximum RTC port must parse"),
            workers: example_value("MEDIA_WORKERS")
                .parse()
                .expect("example worker count must parse"),
            grant_public_key: Some("A6EHv/POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg=".into()),
            allowed_origin: Some(example_value("MEDIA_ALLOWED_ORIGIN").into()),
            peer_ping_interval: std::time::Duration::from_secs(20),
            peer_silence_limit: std::time::Duration::from_secs(60),
        };

        assert_eq!(
            validate_origin_policy(&config, Admission::RequireGrant),
            Ok(())
        );
        assert_eq!(
            validate_announced_address_policy(&config, Admission::RequireGrant),
            Ok(())
        );
        assert!(GrantVerifier::from_config(&config, Admission::RequireGrant).is_ok());
    }

    #[test]
    fn externally_bound_grant_mode_cannot_announce_loopback() {
        let mut config = config(Some("https://app.example.test"));
        config.bind_address = "0.0.0.0:4443".into();

        assert_eq!(
            validate_announced_address_policy(&config, Admission::RequireGrant),
            Err(ConfigError::Invalid {
                key: "MEDIA_ANNOUNCED_ADDRESS",
                value: Ipv4Addr::LOCALHOST.to_string(),
            })
        );
    }

    #[test]
    fn a_hostname_bind_address_is_rejected_under_its_own_key() {
        // Before this was validated, `localhost:4443` failed the SocketAddr parse here, silently
        // cleared the loopback exemption, and reported MEDIA_ANNOUNCED_ADDRESS - naming a
        // variable whose value was correct. Config validation now rejects it first.
        let mut config = config(Some("https://app.example.test"));
        config.bind_address = "localhost:4443".into();

        assert_eq!(
            config.bind_socket_address(),
            Err(ConfigError::Invalid {
                key: "MEDIA_BIND_ADDRESS",
                value: "localhost:4443".into(),
            })
        );
        assert_eq!(
            validate_announced_address_policy(&config, Admission::RequireGrant),
            Err(ConfigError::Invalid {
                key: "MEDIA_BIND_ADDRESS",
                value: "localhost:4443".into(),
            }),
            "the policy check must not blame MEDIA_ANNOUNCED_ADDRESS for a bind-address fault"
        );
    }

    #[test]
    fn a_loopback_bind_address_still_permits_loopback_development() {
        let mut config = config(Some("https://app.example.test"));
        config.bind_address = "127.0.0.1:4443".into();

        assert_eq!(
            validate_announced_address_policy(&config, Admission::RequireGrant),
            Ok(())
        );
    }

    #[test]
    fn grant_enforcing_mode_accepts_public_announced_addresses() {
        for address in ["8.8.8.8", "2606:4700:4700::1111"] {
            let mut config = config(Some("https://app.example.test"));
            config.announced_address = address.parse().unwrap();
            assert_eq!(
                validate_announced_address_policy(&config, Admission::RequireGrant),
                Ok(())
            );
        }
    }

    #[test]
    fn explicit_anonymous_local_mode_accepts_loopback_announced_address() {
        assert_eq!(
            validate_announced_address_policy(
                &config(Some("http://127.0.0.1:5173")),
                Admission::AllowAnonymous,
            ),
            Ok(())
        );
    }

    #[test]
    fn anonymous_mode_rejects_every_non_loopback_exposure() {
        for bind_address in ["0.0.0.0:4443", "[::]:4443", "192.168.1.10:4443"] {
            let mut config = config(None);
            config.bind_address = bind_address.into();
            assert!(matches!(
                validate_announced_address_policy(&config, Admission::AllowAnonymous),
                Err(ConfigError::Invalid {
                    key: "MEDIA_BIND_ADDRESS",
                    ..
                })
            ));
        }

        let mut config = config(None);
        config.announced_address = "192.168.1.10".parse().unwrap();
        assert!(matches!(
            validate_announced_address_policy(&config, Admission::AllowAnonymous),
            Err(ConfigError::Invalid {
                key: "MEDIA_ANNOUNCED_ADDRESS",
                ..
            })
        ));
    }
}
