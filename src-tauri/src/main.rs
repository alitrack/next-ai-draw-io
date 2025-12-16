// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// TEMPORARILY DISABLED FOR DEBUGGING - RE-ENABLE AFTER FIXING CRASH
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;
use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;

// Global variable to store the Next.js server process
static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

fn main() {
    println!("=== Next AI Draw.io Starting ===");
    println!("Initializing Tauri application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_dialog,
            read_file,
            write_file,
            check_for_updates_command
        ])
        .setup(|app| {
            println!("Setup hook called");
            #[cfg(not(debug_assertions))]
            {
                println!("Production mode detected - starting Next.js server");
                // Start Next.js server in production mode
                match start_nextjs_server(app.handle().clone()) {
                    Ok(_) => println!("Next.js server started successfully"),
                    Err(e) => {
                        eprintln!("FATAL ERROR starting Next.js server: {}", e);
                        eprintln!("Error details: {:?}", e);
                        return Err(e);
                    }
                }
            }
            #[cfg(debug_assertions)]
            {
                println!("Debug mode - skipping Next.js server start");
            }
            println!("Setup completed successfully");
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                println!("Window destroyed - stopping Next.js server");
                // Stop the Next.js server when the window is closed
                stop_nextjs_server();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    println!("Application exited normally");
}

#[cfg(not(debug_assertions))]
fn start_nextjs_server(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs;
    use std::env;

    println!("[1/7] Getting resource directory path...");

    // Try to get resource directory from Tauri (works when bundled)
    let server_path = if let Ok(resource_dir) = app_handle.path().resource_dir() {
        println!("  ✓ Resource directory from Tauri: {:?}", resource_dir);
        let tauri_server_path = resource_dir.join("out");
        if tauri_server_path.exists() {
            println!("  ✓ Using Tauri bundled resources");
            tauri_server_path
        } else {
            println!("  ⚠ Tauri resource dir doesn't contain 'out', trying portable mode...");
            // Fall back to portable mode
            let exe_dir = env::current_exe()?.parent()
                .ok_or("Failed to get exe directory")?
                .to_path_buf();
            println!("  Executable directory: {:?}", exe_dir);
            let portable_path = exe_dir.join("out");
            if portable_path.exists() {
                println!("  ✓ Using portable mode resources");
                portable_path
            } else {
                // Try one more location: next to the project root
                let workspace_path = exe_dir.parent()
                    .and_then(|p| p.parent())
                    .ok_or("Failed to find workspace")?
                    .join("out");
                println!("  Trying workspace path: {:?}", workspace_path);
                if workspace_path.exists() {
                    println!("  ✓ Using workspace resources");
                    workspace_path
                } else {
                    eprintln!("  ✗ Could not find 'out' directory in any location!");
                    eprintln!("  Searched: {:?}, {:?}, {:?}", tauri_server_path, portable_path, workspace_path);
                    return Err("'out' directory not found in any expected location".into());
                }
            }
        }
    } else {
        println!("  ⚠ Could not get Tauri resource directory, using portable mode...");
        // Fall back to portable mode
        let exe_dir = env::current_exe()?.parent()
            .ok_or("Failed to get exe directory")?
            .to_path_buf();
        println!("  Executable directory: {:?}", exe_dir);
        let portable_path = exe_dir.join("out");
        if portable_path.exists() {
            println!("  ✓ Using portable mode resources");
            portable_path
        } else {
            // Try one more location: next to the project root (for dev builds)
            let workspace_path = exe_dir.parent()
                .and_then(|p| p.parent())
                .ok_or("Failed to find workspace")?
                .join("out");
            println!("  Trying workspace path: {:?}", workspace_path);
            if workspace_path.exists() {
                println!("  ✓ Using workspace resources");
                workspace_path
            } else {
                eprintln!("  ✗ Could not find 'out' directory!");
                eprintln!("  Searched: {:?}, {:?}", portable_path, workspace_path);
                return Err("'out' directory not found".into());
            }
        }
    };

    println!("[2/7] Server path determined: {:?}", server_path);

    println!("[3/7] Checking if server.js exists...");
    let server_js = server_path.join("server.js");
    if !server_js.exists() {
        eprintln!("  ✗ server.js not found!");
        eprintln!("  Looking for contents in server path...");
        if let Ok(entries) = fs::read_dir(&server_path) {
            for entry in entries {
                if let Ok(entry) = entry {
                    println!("    - {:?}", entry.path());
                }
            }
        }
        return Err(format!("server.js not found at: {:?}", server_js).into());
    }
    println!("  ✓ server.js exists");

    println!("[4/7] Starting Next.js server...");

    // 优先使用 portable 目录中的 node.exe（如果存在）
    let exe_dir = env::current_exe()?.parent()
        .ok_or("Failed to get exe directory")?
        .to_path_buf();
    let portable_node = exe_dir.join("node.exe");

    let node_command = if portable_node.exists() {
        println!("  ✓ 使用 portable 模式的 Node.js: {:?}", portable_node);
        portable_node.to_string_lossy().to_string()
    } else {
        println!("  ⚠ 未找到 portable Node.js，使用系统 PATH 中的 node");
        println!("  提示: 如需完全 portable，请将 node.exe 放到可执行文件目录");
        "node".to_string()
    };

    println!("  Command: {} server.js", node_command);
    println!("  Working directory: {:?}", server_path);
    println!("  Environment: PORT=6001");

    // Start the Next.js server with output capture
    let child = match Command::new(&node_command)
        .arg("server.js")
        .current_dir(&server_path)
        .env("PORT", "6001")
        .spawn() {
        Ok(child) => {
            println!("  ✓ Server process spawned (PID: {:?})", child.id());
            child
        }
        Err(e) => {
            eprintln!("  ✗ Failed to spawn server process: {}", e);
            if !portable_node.exists() {
                eprintln!("  Is Node.js installed and in PATH?");
                eprintln!("  Or place node.exe in the application directory for portable mode");
            }
            return Err(Box::new(e));
        }
    };

    // Store the process handle
    println!("[5/7] Storing process handle...");
    *SERVER_PROCESS.lock().unwrap() = Some(child);
    println!("  ✓ Process handle stored");

    // Wait a bit for the server to start
    println!("[6/7] Waiting for server to start (2 seconds)...");
    std::thread::sleep(std::time::Duration::from_secs(2));
    println!("  ✓ Wait complete");

    // Get the main window and load the Next.js app
    println!("[7/7] Loading Next.js app in window...");
    if let Some(window) = app_handle.get_webview_window("main") {
        println!("  Found main window, loading http://localhost:6001");
        match window.eval("window.location.href = 'http://localhost:6001';") {
            Ok(_) => println!("  ✓ URL loaded successfully"),
            Err(e) => {
                eprintln!("  ✗ Failed to load URL: {}", e);
                return Err(Box::new(e));
            }
        }
    } else {
        eprintln!("  ✗ Main window not found!");
        return Err("Main window not found".into());
    }

    println!("=== Server startup complete ===");
    Ok(())
}

fn stop_nextjs_server() {
    if let Ok(mut process) = SERVER_PROCESS.lock() {
        if let Some(mut child) = process.take() {
            let _ = child.kill();
            println!("Next.js server stopped");
        }
    }
}

// 打开文件对话框的函数
#[tauri::command]
async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = app.dialog()
        .file()
        .add_filter("Diagram Files", &["xml", "drawio"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => match path.as_path() {
            Some(p) => Ok(Some(p.to_string_lossy().to_string())),
            None => Ok(None),
        },
        None => Ok(None),
    }
}

// 保存文件对话框的函数
#[tauri::command]
async fn save_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = app.dialog()
        .file()
        .add_filter("Diagram Files", &["xml", "drawio"])
        .set_file_name("diagram.xml")
        .blocking_save_file();

    match file_path {
        Some(path) => match path.as_path() {
            Some(p) => Ok(Some(p.to_string_lossy().to_string())),
            None => Ok(None),
        },
        None => Ok(None),
    }
}

// 读取文件内容的函数
#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let path = Path::new(&file_path);

    // 检查文件是否存在
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // 检查是否为文件
    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }

    // 读取文件内容
    match fs::read_to_string(path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e))
    }
}

// 写入文件内容的函数
#[tauri::command]
fn write_file(file_path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let path = Path::new(&file_path);

    // 创建父目录（如果不存在）
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(format!("Failed to create directory: {}", e));
        }
    }

    // 写入文件内容
    match fs::write(path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e))
    }
}

// 检查更新的命令函数
#[tauri::command]
async fn check_for_updates_command(app: tauri::AppHandle) -> Result<bool, String> {
    check_for_updates(app).await
}

// 检查更新的实际实现
async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    // 在 Tauri v2 中，更新检查通过配置文件自动处理
    // 我们可以直接使用 app.updater() 来检查更新
    match app.updater() {
        Ok(updater) => {
            match updater.check().await {
                Ok(Some(_update)) => {
                    // 如果有可用更新，返回 true
                    Ok(true)
                }
                Ok(None) => {
                    // 如果没有可用更新，返回 false
                    Ok(false)
                }
                Err(e) => {
                    // 如果检查更新失败，返回错误信息
                    Err(format!("Failed to check for updates: {}", e))
                }
            }
        }
        Err(e) => {
            // 如果获取 updater 失败，返回错误信息
            Err(format!("Failed to get updater: {}", e))
        }
    }
}