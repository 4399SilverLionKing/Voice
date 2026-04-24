from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


SERVER_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SERVER_ROOT.parent
load_dotenv(SERVER_ROOT / ".env")


def _resolve_path(value: str | None, default: Path) -> Path:
    if not value:
        return default.resolve()

    path = Path(value)
    if path.is_absolute():
        return path
    return (SERVER_ROOT / path).resolve()


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    praat_exe: Path
    praat_script: Path
    praat_timeout_seconds: int
    cors_origins: list[str]


def _default_praat_exe() -> Path:
    candidates = [
        Path(r"E:\Praat\Praat.exe"),
        Path(r"C:\Program Files\Praat.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def get_settings() -> Settings:
    return Settings(
        data_dir=_resolve_path(os.getenv("VOICE_DATA_DIR"), PROJECT_ROOT / "data" / "tasks"),
        praat_exe=_resolve_path(os.getenv("PRAAT_EXE"), _default_praat_exe()),
        praat_script=_resolve_path(
            os.getenv("PRAAT_SCRIPT"),
            PROJECT_ROOT / "scripts" / "praat" / "analyze_voice.praat",
        ),
        praat_timeout_seconds=int(os.getenv("PRAAT_TIMEOUT_SECONDS", "60")),
        cors_origins=_parse_origins(os.getenv("VOICE_CORS_ORIGINS")),
    )
