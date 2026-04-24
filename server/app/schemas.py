from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


TaskStatus = Literal["completed", "failed"]


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class TaskSummary(BaseModel):
    task_id: str
    status: TaskStatus
    created_at: str
    input_file: str
    metrics_file: str | None = None
    report_file: str | None = None
    error: ErrorPayload | None = None


class MetricValue(BaseModel):
    label: str
    value: str
    explanation: str
    status: Literal["ok", "notice", "warning"] = "ok"


class Report(BaseModel):
    task_id: str
    summary: str
    confidence: Literal["high", "medium", "low"]
    notices: list[str]
    metrics: list[MetricValue]
    recommendations: list[str]
    raw_metrics: dict[str, Any]

