#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| format!("Failed to close window: {}", e))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![close_window])
        .setup(|app| {
            // 안전한 윈도우 조회
            let window = match app.get_window("main") {
                Some(w) => w,
                None => return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, "Failed to get main window"))),
            };

            // 윈도우 설정
            if let Err(e) = window.set_always_on_top(true) {
                return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to set always on top: {}", e))));
            }
            if let Err(e) = window.set_decorations(false) {
                return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("Failed to set decorations: {}", e))));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}