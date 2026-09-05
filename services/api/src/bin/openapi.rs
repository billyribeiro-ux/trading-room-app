//! Emits the deterministic OpenAPI document consumed by SvelteKit client generation.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&tradingroom_api::openapi::document())?
    );
    let arguments = std::env::args().skip(1).collect::<Vec<_>>();
    match arguments.as_slice() {
        [] => print!("{rendered}"),
        [flag, path] if flag == "--output" => std::fs::write(path, rendered)?,
        _ => return Err("usage: openapi [--output PATH]".into()),
    }
    Ok(())
}
