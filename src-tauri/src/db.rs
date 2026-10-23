//! The app's SQLite file. The screens' data code (TypeScript) reaches it through two commands: one reads rows, one runs
//! statements together in a transaction. One connection serves every call, so a transaction really is one.

use rusqlite::types::{Value, ValueRef};
use rusqlite::{params_from_iter, Connection};
use serde::Deserialize;
use serde_json::{json, Map, Value as Json};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct Db(Mutex<Connection>);

#[derive(Deserialize)]
pub struct Statement {
    query: String,
    #[serde(default)]
    params: Vec<Json>,
}

/// Opens (and makes, if it is not there yet) `cadence.db` in the app's data folder.
pub fn open(app: &AppHandle) -> Result<Db, Box<dyn std::error::Error>> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;

    let conn = Connection::open(dir.join("cadence.db"))?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", true)?;

    Ok(Db(Mutex::new(conn)))
}

fn to_value(value: &Json) -> Value {
    match value {
        Json::Null => Value::Null,
        Json::Bool(b) => Value::Integer(*b as i64),
        Json::Number(n) => match n.as_i64() {
            Some(i) => Value::Integer(i),
            None => Value::Real(n.as_f64().unwrap_or(0.0)),
        },
        Json::String(s) => Value::Text(s.clone()),
        other => Value::Text(other.to_string()),
    }
}

fn to_json(value: ValueRef) -> Json {
    match value {
        ValueRef::Integer(n) => json!(n),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => json!(String::from_utf8_lossy(t)),
        ValueRef::Null | ValueRef::Blob(_) => Json::Null,
    }
}

/// Runs one query and returns its rows as objects keyed by column name.
#[tauri::command]
pub fn sql_select(db: State<Db>, query: String, params: Vec<Json>) -> Result<Vec<Json>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt.column_names().iter().map(|n| n.to_string()).collect();
    let mut rows = stmt
        .query(params_from_iter(params.iter().map(to_value)))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();

    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut object = Map::new();

        for (i, name) in names.iter().enumerate() {
            object.insert(name.clone(), to_json(row.get_ref(i).map_err(|e| e.to_string())?));
        }

        out.push(Json::Object(object));
    }

    Ok(out)
}

/// Runs the statements one after another in a single transaction: all of them happen, or none do.
#[tauri::command]
pub fn sql_batch(db: State<Db>, statements: Vec<Statement>) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for statement in &statements {
        tx.execute(&statement.query, params_from_iter(statement.params.iter().map(to_value)))
            .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}
