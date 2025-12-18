use serde::{Deserialize, Serialize};
use std::env;

// Configuration response
#[derive(Debug, Serialize)]
pub struct ConfigResponse {
    access_code_required: bool,
    daily_request_limit: u32,
    daily_token_limit: u32,
    tpm_limit: u32,
}

// Access code verification request
#[derive(Debug, Deserialize)]
pub struct VerifyAccessCodeRequest {
    access_code: String,
}

// Access code verification response
#[derive(Debug, Serialize)]
pub struct VerifyAccessCodeResponse {
    valid: bool,
    message: String,
}

// Get configuration from environment variables
#[tauri::command]
pub fn get_config() -> Result<ConfigResponse, String> {
    Ok(ConfigResponse {
        access_code_required: env::var("ACCESS_CODE_LIST").is_ok(),
        daily_request_limit: env::var("DAILY_REQUEST_LIMIT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
        daily_token_limit: env::var("DAILY_TOKEN_LIMIT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
        tpm_limit: env::var("TPM_LIMIT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0),
    })
}

// Verify access code
#[tauri::command]
pub fn verify_access_code(access_code: String) -> Result<VerifyAccessCodeResponse, String> {
    let access_codes_str = env::var("ACCESS_CODE_LIST").unwrap_or_default();
    let access_codes: Vec<String> = access_codes_str
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // If no access codes configured, verification always passes
    if access_codes.is_empty() {
        return Ok(VerifyAccessCodeResponse {
            valid: true,
            message: "No access code required".to_string(),
        });
    }

    if access_code.is_empty() {
        return Ok(VerifyAccessCodeResponse {
            valid: false,
            message: "Access code is required".to_string(),
        });
    }

    if access_codes.contains(&access_code) {
        Ok(VerifyAccessCodeResponse {
            valid: true,
            message: "Access code is valid".to_string(),
        })
    } else {
        Ok(VerifyAccessCodeResponse {
            valid: false,
            message: "Invalid access code".to_string(),
        })
    }
}
