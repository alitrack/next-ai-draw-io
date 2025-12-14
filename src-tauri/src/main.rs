// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;

fn main() {
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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