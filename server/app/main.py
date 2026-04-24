from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import AudioValidationError, read_wav_metadata
from .config import get_settings
from .interpreter import build_report
from .praat import AnalysisError, run_analysis
from .schemas import ErrorPayload, Report, TaskSummary
from .storage import (
    completed_summary,
    create_task_dir,
    failed_summary,
    find_task_dir,
    read_json,
    read_task_summary,
    save_upload,
    utc_now_iso,
    write_json,
    write_report,
    write_task_summary,
)


settings = get_settings()

app = FastAPI(title="Voice Analysis API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "data_dir": str(settings.data_dir),
        "praat_exe": str(settings.praat_exe),
        "praat_script": str(settings.praat_script),
    }


@app.post("/api/tasks", response_model=TaskSummary)
async def create_task(file: UploadFile = File(...)) -> TaskSummary:
    filename = file.filename or ""
    if not filename.lower().endswith(".wav"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "audio_unsupported_format",
                "message": "当前 MVP 仅支持 WAV 文件上传。",
            },
        )

    task_id, task_dir = create_task_dir(settings.data_dir)
    input_wav = task_dir / "input.wav"
    metrics_json = task_dir / "metrics.json"

    await save_upload(file, input_wav)

    try:
        metadata = read_wav_metadata(input_wav)
        write_json(task_dir / "input_metadata.json", metadata)
        metrics = run_analysis(settings, input_wav, metrics_json, task_dir)
        report = build_report(task_id, metrics)
        report_path = write_report(task_dir, report)
        summary = completed_summary(task_id, input_wav, metrics_json, report_path)
    except AudioValidationError as exc:
        summary = failed_summary(
            task_id,
            input_wav,
            ErrorPayload(code=exc.code, message=exc.message),
        )
    except AnalysisError as exc:
        summary = failed_summary(
            task_id,
            input_wav,
            ErrorPayload(code=exc.code, message=exc.message, details=exc.details),
        )
    except Exception as exc:
        summary = failed_summary(
            task_id,
            input_wav,
            ErrorPayload(
                code="analysis_unexpected_error",
                message="分析任务出现未预期错误。",
                details={"type": type(exc).__name__},
            ),
        )

    write_task_summary(task_dir, summary)
    return summary


@app.get("/api/tasks/{task_id}", response_model=TaskSummary)
def get_task(task_id: str) -> TaskSummary:
    try:
        task_dir = find_task_dir(settings.data_dir, task_id)
        return read_task_summary(task_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Task not found") from exc


@app.get("/api/tasks/{task_id}/report", response_model=Report)
def get_report(task_id: str) -> Report:
    try:
        task_dir = find_task_dir(settings.data_dir, task_id)
        summary = read_task_summary(task_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Task not found") from exc

    if summary.status != "completed" or not summary.report_file:
        raise HTTPException(
            status_code=409,
            detail={
                "code": summary.error.code if summary.error else "report_not_ready",
                "message": summary.error.message if summary.error else "报告尚未生成。",
            },
        )

    return Report.model_validate(read_json(task_dir / "report.json"))
