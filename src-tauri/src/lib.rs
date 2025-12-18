

mod commands;
mod ai_chat;
mod ai_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Load .env files in development mode
  #[cfg(debug_assertions)]
  {
    // Try to load .env from project root (parent directory)
    match dotenv::from_filename("../.env") {
      Ok(_) => println!("[DEBUG] Successfully loaded ../.env"),
      Err(_) => {
        // If parent .env doesn't exist, try current directory
        match dotenv::dotenv() {
          Ok(_) => println!("[DEBUG] Successfully loaded .env from current directory"),
          Err(e) => eprintln!("Warning: Failed to load .env files: {}", e),
        }
      }
    }
    
    // Debug: Print some key environment variables
    println!("[DEBUG] AI_PROVIDER: {:?}", std::env::var("AI_PROVIDER"));
    println!("[DEBUG] AI_MODEL: {:?}", std::env::var("AI_MODEL"));
    println!("[DEBUG] GEMINI_API_KEY exists: {}", std::env::var("GEMINI_API_KEY").is_ok());
    println!("[DEBUG] OPENAI_API_KEY exists: {}", std::env::var("OPENAI_API_KEY").is_ok());
  }

  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      commands::get_config,
      commands::verify_access_code,
      ai_commands::chat_stream,
    ])
    .setup(|_app| {
      #[cfg(debug_assertions)]
      {
        println!("[Development] Running in development mode");
        println!("[Development] Expecting Next.js dev server on port 6002");
      }

      Ok(())
    });

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
