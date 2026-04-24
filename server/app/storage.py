from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from .schemas import ErrorPayload, Report, TaskSummary


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def create_task_dir(data_dir: Path) -> tuple[str, Path]:
    data_dir.mkdir(parents=True, exist_ok=True)
    task_id = uuid4().hex
    task_dir = data_dir / task_id
    task_dir.mkdir()
    return task_id, task_dir


async def save_upload(upload: UploadFile, destination: Path) -> None:
    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            output.write(chunk)


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_task_summary(task_dir: Path, summary: TaskSummary) -> None:
    write_json(task_dir / "task.json", summary.model_dump(mode="json"))


def read_task_summary(task_dir: Path) -> TaskSummary:
    return TaskSummary.model_validate(read_json(task_dir / "task.json"))


def find_task_dir(data_dir: Path, task_id: str) -> Path:
    task_dir = (data_dir / task_id).resolve()
    data_root = data_dir.resolve()

    if data_root not in task_dir.parents:
        raise FileNotFoundError(task_id)
    if not task_dir.exists() or not task_dir.is_dir():
        raise FileNotFoundError(task_id)
    return task_dir


def failed_summary(task_id: str, input_file: Path, error: ErrorPayload) -> TaskSummary:
    return TaskSummary(
        task_id=task_id,
        status="failed",
        created_at=utc_now_iso(),
        input_file=str(input_file),
        error=error,
    )


def completed_summary(task_id: str, input_file: Path, metrics_file: Path, report_file: Path) -> TaskSummary:
    return TaskSummary(
        task_id=task_id,
        status="completed",
        created_at=utc_now_iso(),
        input_file=str(input_file),
        metrics_file=str(metrics_file),
        report_file=str(report_file),
    )


def write_report(task_dir: Path, report: Report) -> Path:
    report_path = task_dir / "report.json"
    write_json(report_path, report.model_dump(mode="json"))
    return report_path

