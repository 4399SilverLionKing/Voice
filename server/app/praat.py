from __future__ import annotations

import subprocess
from pathlib import Path

from .config import Settings
from .storage import read_json


class AnalysisError(RuntimeError):
    def __init__(self, code: str, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def run_analysis(settings: Settings, input_wav: Path, metrics_json: Path, task_dir: Path) -> dict:
    return run_praat(settings, input_wav, metrics_json, task_dir)


def run_praat(settings: Settings, input_wav: Path, metrics_json: Path, task_dir: Path) -> dict:
    if not settings.praat_exe.exists():
        raise AnalysisError("praat_not_found", "未找到 Praat.exe，请检查 PRAAT_EXE 配置。")
    if not settings.praat_script.exists():
        raise AnalysisError("praat_script_missing", "未找到 Praat 分析脚本，请检查 PRAAT_SCRIPT 配置。")

    command = [
        str(settings.praat_exe),
        "--run",
        "--no-pref-files",
        "--utf8",
        str(settings.praat_script),
        str(input_wav),
        str(metrics_json),
    ]

    try:
        result = subprocess.run(
            command,
            cwd=str(settings.praat_script.parent),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=settings.praat_timeout_seconds,
            check=True,
        )
    except subprocess.TimeoutExpired as exc:
        raise AnalysisError("praat_timeout", "Praat 分析超时。", {"timeout_seconds": exc.timeout}) from exc
    except subprocess.CalledProcessError as exc:
        (task_dir / "praat_stdout.txt").write_text(exc.stdout or "", encoding="utf-8")
        (task_dir / "praat_stderr.txt").write_text(exc.stderr or "", encoding="utf-8")
        raise AnalysisError(
            "praat_execution_failed",
            "Praat 执行失败，请查看任务日志。",
            {"returncode": exc.returncode},
        ) from exc

    (task_dir / "praat_stdout.txt").write_text(result.stdout or "", encoding="utf-8")
    (task_dir / "praat_stderr.txt").write_text(result.stderr or "", encoding="utf-8")

    if not metrics_json.exists():
        raise AnalysisError("metrics_missing", "Praat 执行完成，但未生成 metrics.json。")

    try:
        return read_json(metrics_json)
    except ValueError as exc:
        raise AnalysisError("metrics_invalid_json", "metrics.json 不是合法 JSON。") from exc
