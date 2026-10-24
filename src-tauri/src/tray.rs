use serde::Deserialize;
use tauri::{
  menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Emitter, Manager, Wry,
};

const TRAY_ID: &str = "main";

/// An open habit of today, as the page tells the tray about it.
#[derive(Deserialize)]
pub struct TrayHabit {
  id: String,
  name: String,
}

/// Brings the main window back, from the tray or from behind other windows.
pub fn show(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

/// The tray menu: Open, the focus entry, and Quit. The focus entry depends on the day: a running session is shown, else
/// each habit still open today can be started from a submenu. The labels are English until the app has languages.
fn menu(app: &AppHandle, running: bool, habits: &[TrayHabit]) -> tauri::Result<Menu<Wry>> {
  let open = MenuItem::with_id(app, "open", "Open Cadence", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
  let line = PredefinedMenuItem::separator(app)?;

  if running {
    let item = MenuItem::with_id(app, "focus:running", "Show running focus", true, None::<&str>)?;

    return Menu::with_items(app, &[&open as &dyn IsMenuItem<Wry>, &item, &line, &quit]);
  }

  if habits.is_empty() {
    let item = MenuItem::with_id(app, "focus:none", "Start focus (nothing open today)", false, None::<&str>)?;

    return Menu::with_items(app, &[&open as &dyn IsMenuItem<Wry>, &item, &line, &quit]);
  }

  let items = habits
    .iter()
    .map(|habit| MenuItem::with_id(app, format!("focus:{}", habit.id), &habit.name, true, None::<&str>))
    .collect::<tauri::Result<Vec<_>>>()?;
  let refs: Vec<&dyn IsMenuItem<Wry>> = items.iter().map(|item| item as &dyn IsMenuItem<Wry>).collect();
  let submenu = Submenu::with_items(app, "Start focus", true, &refs)?;

  Menu::with_items(app, &[&open as &dyn IsMenuItem<Wry>, &submenu, &line, &quit])
}

/// The tray icon: a click opens the app, and the menu starts a focus session. Choosing a habit brings the window up and
/// tells the page (`tray-focus`, with the habit's id, or `running`), which opens that habit's focus panel.
pub fn build(app: &AppHandle) -> tauri::Result<()> {
  let mut tray = TrayIconBuilder::with_id(TRAY_ID)
    .tooltip("Cadence")
    .menu(&menu(app, false, &[])?)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| {
      let id = event.id.as_ref();

      if id == "open" {
        show(app);
      } else if id == "quit" {
        app.exit(0);
      } else if let Some(target) = id.strip_prefix("focus:") {
        show(app);
        let _ = app.emit("tray-focus", target.to_string());
      }
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        show(tray.app_handle());
      }
    });

  if let Some(icon) = app.default_window_icon() {
    tray = tray.icon(icon.clone());
  }

  tray.build(app)?;

  Ok(())
}

/// The page tells the tray what today looks like (a session running, or which habits are still open), so the menu can
/// offer to start one.
#[tauri::command]
pub fn set_tray_habits(app: AppHandle, running: bool, habits: Vec<TrayHabit>) -> Result<(), String> {
  let tray = app.tray_by_id(TRAY_ID).ok_or("the tray is not there")?;
  let menu = menu(&app, running, &habits).map_err(|error| error.to_string())?;

  tray.set_menu(Some(menu)).map_err(|error| error.to_string())
}
