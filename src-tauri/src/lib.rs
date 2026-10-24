use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

mod db;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Must come first: a second launch (the `cadence://` link back from the browser) hands over to the running app.
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // A development run is not installed, so it registers the link itself; an installed app has it from its installer.
      #[cfg(any(windows, target_os = "linux"))]
      app.deep_link().register_all()?;

      app.manage(db::open(app.handle())?);
      tray::build(app.handle())?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![db::sql_select, db::sql_batch])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
