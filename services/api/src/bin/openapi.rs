//! Prints the deterministic OpenAPI document consumed by SvelteKit client generation.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!(
        "{}",
        serde_json::to_string_pretty(&tradingroom_api::openapi::document())?
    );
    Ok(())
}
