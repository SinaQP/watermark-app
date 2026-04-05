use std::{fs, io::ErrorKind, path::PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;

#[derive(Serialize)]
struct ExportWatermarkedImageResponse {
    bytes_written: usize,
    path: String,
}

#[tauri::command]
fn export_watermarked_image(
    path: String,
    base64_data: String,
    format: String,
) -> Result<ExportWatermarkedImageResponse, String> {
    let extension = match format.as_str() {
        "png" => "png",
        "jpg" => "jpg",
        _ => return Err("Unsupported export format. Choose PNG or JPG.".into()),
    };
    let output_path = normalize_output_path(PathBuf::from(path), extension);
    let parent = output_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or_else(|| "Choose a destination folder and file name for the export.".to_string())?;

    if !parent.exists() {
        return Err("The selected save folder no longer exists. Choose another location.".into());
    }

    if output_path.is_dir() {
        return Err("Choose a file name instead of a folder for the export.".into());
    }

    let bytes = STANDARD
        .decode(base64_data)
        .map_err(|_| "The rendered export could not be prepared for saving.".to_string())?;

    if bytes.is_empty() {
        return Err("The export did not contain any image data.".into());
    }

    fs::write(&output_path, &bytes).map_err(map_write_error)?;

    Ok(ExportWatermarkedImageResponse {
        bytes_written: bytes.len(),
        path: output_path.to_string_lossy().into_owned(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![export_watermarked_image])
        .run(tauri::generate_context!())
        .expect("error while running watermark app");
}

fn normalize_output_path(path: PathBuf, extension: &str) -> PathBuf {
    let mut normalized = path;
    normalized.set_extension(extension);
    normalized
}

fn map_write_error(error: std::io::Error) -> String {
    match error.kind() {
        ErrorKind::PermissionDenied => {
            "The app could not write to that location. Choose a folder you can access.".into()
        }
        ErrorKind::NotFound => {
            "The selected save folder could not be found. Choose another location.".into()
        }
        _ => format!("Export failed while writing the file: {error}"),
    }
}
