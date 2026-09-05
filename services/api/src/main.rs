//! Thin binary: environment, startup ordering, shutdown. All behaviour lives in the lib.
//!
//! Startup order is deliberate and borrowed from `tradingroom-media`: **every fallible step
//! happens before the listener binds.** A process that has accepted a connection should
//! never then discover it cannot reach the database or that it holds the wrong role.

use std::sync::Arc;

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use ed25519_dalek::SigningKey;
use tracing_subscriber::EnvFilter;
use tradingroom_api::config::Config;
use tradingroom_api::db::Db;
use tradingroom_api::http::{AppState, router};

#[derive(Debug, thiserror::Error)]
enum StartupError {
    #[error(transparent)]
    Config(#[from] tradingroom_api::config::ConfigError),
    #[error(transparent)]
    Db(#[from] tradingroom_api::db::DbError),
    #[error("{key} must be 32 bytes of standard base64: {reason}")]
    SigningKey {
        key: &'static str,
        reason: &'static str,
    },
    #[error("could not bind {address}")]
    Bind {
        address: String,
        #[source]
        source: std::io::Error,
    },
    #[error("server failed")]
    Serve(#[source] std::io::Error),
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,sqlx=warn")),
        )
        .init();

    match run().await {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(error) => {
            // Both, on purpose: stderr survives a broken subscriber, and the structured
            // event is what a log aggregator will index.
            eprintln!("startup failed: {error}");
            tracing::error!(%error, "startup failed");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<(), StartupError> {
    let config = Config::from_env()?;

    let signing_key = parse_signing_key("AUTH_TOKEN_PRIVATE_KEY", &config.auth_token_private_key)?;
    let grant_key = parse_signing_key("MEDIA_GRANT_PRIVATE_KEY", &config.media_grant_private_key)?;

    let db = Db::connect(
        &config.database_url,
        config.db_pool_max,
        config.db_acquire_timeout,
    )
    .await?;

    // The single most important startup check. A privileged role, inherited grant, or
    // selectable membership could escape the direct grants and RLS policy set while the
    // service looked perfectly healthy.
    db.assert_runtime_role_is_restricted().await?;

    tracing::info!(
        bind_address = %config.bind_address,
        db_pool_max = config.db_pool_max,
        "configuration validated"
    );

    let state = Arc::new(AppState::configured(
        db,
        signing_key,
        grant_key,
        config.trusted_proxy_hops,
        config.trusted_web_origin.clone(),
        config.controller_internal_secret.as_deref(),
    ));
    let app = router(Arc::clone(&state), config.request_timeout);

    // Cross-instance realtime fan-out. `start` returns only after PostgreSQL has acknowledged
    // LISTEN. A process that cannot establish it therefore exits before binding, while a later
    // disconnect immediately drops `/readyz` until the relay reconnects.
    let _relay = tradingroom_api::realtime::relay::start(Arc::clone(&state)).await?;

    // Retention for the realtime outbox. Without it `room_events` is the one table that grows
    // without bound, because every mutation writes to it.
    tokio::spawn(tradingroom_api::jobs::prune_room_events(Arc::clone(&state)));

    let listener = tokio::net::TcpListener::bind(&config.bind_address)
        .await
        .map_err(|source| StartupError::Bind {
            address: config.bind_address.clone(),
            source,
        })?;

    tracing::info!(address = %config.bind_address, "listening");

    // `into_make_service_with_connect_info` is what makes the peer address available to
    // handlers; without it every request looks like it came from nowhere and the IP-keyed
    // rate limits silently degrade to a single shared bucket.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown({
        let state = Arc::clone(&state);
        async move {
            shutdown_signal().await;
            // Live WebSockets are not HTTP requests, so axum's graceful shutdown does not
            // drain them - without this they would simply have their sockets torn out. `Err`
            // only means no socket is open, which is the idle case.
            let _ = state.shutdown.send(());
        }
    })
    .await
    .map_err(StartupError::Serve)?;

    // Closed after the server has drained, so in-flight requests keep their connections.
    state.db.close().await;
    tracing::info!("shutdown complete");
    Ok(())
}

/// Decodes one Ed25519 signing key.
///
/// The variable name travels with the error: two keys are read at startup and "must be 32
/// bytes of base64" without saying which one is a needlessly bad morning. The key material
/// itself is never included - an error string is exactly the sort of thing that ends up in a
/// log aggregator.
fn parse_signing_key(key: &'static str, encoded: &str) -> Result<SigningKey, StartupError> {
    let bytes = STANDARD
        .decode(encoded.trim())
        .map_err(|_| StartupError::SigningKey {
            key,
            reason: "not valid base64",
        })?;
    let bytes: [u8; 32] = bytes.try_into().map_err(|_| StartupError::SigningKey {
        key,
        reason: "expected exactly 32 bytes",
    })?;
    Ok(SigningKey::from_bytes(&bytes))
}

/// Resolves on SIGINT or SIGTERM. A handler that cannot be installed must never resolve,
/// or the process would shut down the instant it started.
async fn shutdown_signal() {
    let ctrl_c = async {
        if tokio::signal::ctrl_c().await.is_err() {
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => tracing::info!("received SIGINT, shutting down"),
        () = terminate => tracing::info!("received SIGTERM, shutting down"),
    }
}
