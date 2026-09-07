use crate::{
    output::{LocalError, Result},
    server::Holi,
};
use axum::{
    Router,
    body::{Body, to_bytes},
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
};
use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};
use std::{sync::Arc, time::Duration};
use subtle::ConstantTimeEq;
use tokio::sync::Semaphore;

#[derive(Clone)]
struct Guard {
    token: Arc<Vec<u8>>,
    hosts: Arc<Vec<String>>,
    requests: Arc<Semaphore>,
}
fn reject(status: StatusCode) -> Response {
    (
        status,
        [(header::CONTENT_TYPE, "application/json")],
        "{\"error\":\"Request rejected\"}",
    )
        .into_response()
}

async fn protect(State(guard): State<Guard>, request: Request, next: Next) -> Response {
    let headers = request.headers();
    let host = headers.get(header::HOST).and_then(|h| h.to_str().ok());
    if !host.is_some_and(|h| guard.hosts.iter().any(|allowed| allowed == h)) {
        return reject(StatusCode::FORBIDDEN);
    }
    if let Some(origin) = headers.get(header::ORIGIN) {
        if !origin
            .to_str()
            .ok()
            .is_some_and(|o| guard.hosts.iter().any(|h| o == format!("http://{h}")))
        {
            return reject(StatusCode::FORBIDDEN);
        }
    }
    let auth = headers
        .get(header::AUTHORIZATION)
        .map(|v| v.as_bytes())
        .unwrap_or_default();
    if auth.ct_eq(guard.token.as_slice()).unwrap_u8() != 1 {
        return reject(StatusCode::UNAUTHORIZED);
    }
    if request.uri().path_and_query().map(|v| v.as_str()) != Some("/mcp") {
        return reject(StatusCode::NOT_FOUND);
    }
    if request.method() != axum::http::Method::POST {
        return reject(StatusCode::METHOD_NOT_ALLOWED);
    }
    if !headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_ascii_lowercase().starts_with("application/json"))
    {
        return reject(StatusCode::UNSUPPORTED_MEDIA_TYPE);
    }
    let Ok(_permit) = guard.requests.clone().try_acquire_owned() else {
        return reject(StatusCode::TOO_MANY_REQUESTS);
    };
    if headers
        .get(header::CONTENT_LENGTH)
        .and_then(|h| h.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .is_some_and(|n| n > 12 * 1024 * 1024)
    {
        return reject(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let (parts, body) = request.into_parts();
    let bytes =
        match tokio::time::timeout(Duration::from_secs(30), to_bytes(body, 12 * 1024 * 1024)).await
        {
            Ok(Ok(bytes)) => bytes,
            Ok(Err(_)) => return reject(StatusCode::PAYLOAD_TOO_LARGE),
            Err(_) => return reject(StatusCode::REQUEST_TIMEOUT),
        };
    next.run(Request::from_parts(parts, Body::from(bytes)))
        .await
}

pub async fn serve(service: Holi, port: u16) -> Result<()> {
    let token = std::env::var("HOLI_MCP_TOKEN").unwrap_or_default();
    if token.len() < 32 || token.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(LocalError(
            "STARTUP",
            "HOLI_MCP_TOKEN must contain at least 32 non-whitespace characters",
        ));
    }
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port))
        .await
        .map_err(|_| LocalError("STARTUP", "The loopback port is occupied or unavailable"))?;
    let hosts = vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")];
    let config = StreamableHttpServerConfig::default()
        .with_legacy_session_mode(false)
        .with_json_response(true)
        .with_allowed_hosts(hosts.clone())
        .with_allowed_origins(hosts.iter().map(|h| format!("http://{h}")))
        .with_max_request_body_bytes(12 * 1024 * 1024);
    let transport = StreamableHttpService::new(
        move || Ok(service.clone()),
        Arc::new(LocalSessionManager::default()),
        config,
    );
    let guard = Guard {
        token: Arc::new(format!("Bearer {token}").into_bytes()),
        hosts: Arc::new(hosts),
        requests: Arc::new(Semaphore::new(16)),
    };
    let app = Router::new()
        .nest_service("/mcp", transport)
        .layer(middleware::from_fn_with_state(guard, protect));
    eprintln!("Holi Local HTTP MCP listening on loopback.");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .map_err(|_| LocalError("TRANSPORT", "The HTTP connection stopped"))
}
