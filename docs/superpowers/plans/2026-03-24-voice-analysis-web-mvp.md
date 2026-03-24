# Voice Analysis Web MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-first local web application that records or uploads a short voice sample, runs Praat-based analysis locally, and renders a general-purpose voice report.

**Architecture:** The system uses a React + Vite frontend for recording, upload, and report display; a FastAPI backend for file handling, task orchestration, and report generation; and an external Praat script for raw acoustic metric extraction. Business interpretation stays in Python so the analysis engine remains replaceable and specialized workflows can be added later without rewriting the whole pipeline.

**Tech Stack:** React, Vite, TypeScript, FastAPI, Python, pytest, Praat CLI, local file storage

---

## File Structure

### Files to Create

- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app.css`
- `frontend/src/api.ts`
- `frontend/src/types.ts`
- `frontend/src/components/Recorder.tsx`
- `frontend/src/components/UploadForm.tsx`
- `frontend/src/components/ReportView.tsx`
- `frontend/src/components/StatusBanner.tsx`
- `backend/pyproject.toml`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/models.py`
- `backend/app/storage.py`
- `backend/app/praat_runner.py`
- `backend/app/interpreter.py`
- `backend/app/report_builder.py`
- `backend/app/audio_validation.py`
- `backend/tests/conftest.py`
- `backend/tests/test_storage.py`
- `backend/tests/test_audio_validation.py`
- `backend/tests/test_interpreter.py`
- `backend/tests/test_api.py`
- `backend/tests/fixtures/metrics/stable_voice.json`
- `backend/tests/fixtures/metrics/noisy_voice.json`
- `backend/tests/fixtures/audio/README.md`
- `scripts/praat/analyze_voice.praat`
- `scripts/praat/README.md`
- `scripts/dev/start.ps1`
- `docs/setup/local-dev.md`

### Directory Responsibilities

- `frontend/`: UI, browser recording, upload, report display
- `backend/app/`: API server, task orchestration, report generation
- `backend/tests/`: backend and interpretation tests
- `scripts/praat/`: raw acoustic extraction scripts and usage notes
- `docs/`: setup and product docs

## Chunk 1: Project Scaffolding and Local Conventions

### Task 1: Create backend Python project skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing API smoke test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_healthcheck():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_healthcheck -v`
Expected: FAIL with import error because `app.main` or `/health` does not exist.

- [ ] **Step 3: Write minimal FastAPI app**

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_healthcheck -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/app/__init__.py backend/app/main.py backend/tests/conftest.py backend/tests/test_api.py
git commit -m "chore: scaffold backend service"
```

### Task 2: Create frontend Vite skeleton

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/app.css`

- [ ] **Step 1: Write the failing frontend render test or manual smoke target**

Use a minimal manual check for the empty repo:

Expected UI text:

```tsx
<h1>Voice Analysis</h1>
```

- [ ] **Step 2: Start Vite app to verify it currently fails**

Run: `cd frontend; npm install; npm run dev`
Expected: FAIL because project files do not exist yet.

- [ ] **Step 3: Write minimal frontend shell**

```tsx
export default function App() {
  return <h1>Voice Analysis</h1>;
}
```

- [ ] **Step 4: Start frontend to verify it renders**

Run: `cd frontend; npm install; npm run dev`
Expected: Vite starts and the page shows "Voice Analysis".

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "chore: scaffold frontend app"
```

## Chunk 2: Backend Task Storage and Validation

### Task 3: Implement task directory storage

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/storage.py`
- Create: `backend/tests/test_storage.py`

- [ ] **Step 1: Write the failing storage test**

```python
def test_create_task_paths(tmp_path):
    storage = TaskStorage(base_dir=tmp_path)
    task = storage.create_task()
    assert task.task_id
    assert task.task_dir.exists()
    assert task.input_audio_path.name == "input.wav"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_storage.py::test_create_task_paths -v`
Expected: FAIL because `TaskStorage` is undefined.

- [ ] **Step 3: Write minimal storage implementation**

```python
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

@dataclass
class TaskPaths:
    task_id: str
    task_dir: Path
    input_audio_path: Path
    metrics_path: Path
    report_path: Path

class TaskStorage:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir

    def create_task(self) -> TaskPaths:
        task_id = uuid4().hex
        task_dir = self.base_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=False)
        return TaskPaths(
            task_id=task_id,
            task_dir=task_dir,
            input_audio_path=task_dir / "input.wav",
            metrics_path=task_dir / "metrics.json",
            report_path=task_dir / "report.json",
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_storage.py::test_create_task_paths -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/config.py backend/app/storage.py backend/tests/test_storage.py
git commit -m "feat: add local task storage"
```

### Task 4: Validate uploaded audio before analysis

**Files:**
- Create: `backend/app/audio_validation.py`
- Create: `backend/tests/test_audio_validation.py`

- [ ] **Step 1: Write the failing validation tests**

```python
def test_rejects_short_audio():
    result = validate_audio(duration_seconds=1.5, channel_count=1)
    assert result.is_valid is False
    assert result.code == "audio_too_short"

def test_accepts_supported_input():
    result = validate_audio(duration_seconds=5.0, channel_count=1)
    assert result.is_valid is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_audio_validation.py -v`
Expected: FAIL because `validate_audio` does not exist.

- [ ] **Step 3: Write minimal validation rules**

```python
def validate_audio(duration_seconds: float, channel_count: int) -> ValidationResult:
    if channel_count != 1:
        return ValidationResult(False, "unsupported_channels")
    if duration_seconds < 3:
        return ValidationResult(False, "audio_too_short")
    if duration_seconds > 15:
        return ValidationResult(False, "audio_too_long")
    return ValidationResult(True, None)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_audio_validation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/audio_validation.py backend/tests/test_audio_validation.py
git commit -m "feat: add audio validation rules"
```

## Chunk 3: Praat Integration

### Task 5: Add Praat script and output contract

**Files:**
- Create: `scripts/praat/analyze_voice.praat`
- Create: `scripts/praat/README.md`
- Create: `backend/tests/fixtures/audio/README.md`

- [ ] **Step 1: Define the expected metrics output shape**

```json
{
  "duration_seconds": 0.0,
  "sample_rate_hz": 0,
  "voiced_duration_seconds": 0.0,
  "mean_intensity_db": 0.0,
  "mean_f0_hz": 0.0,
  "f0_std_hz": 0.0,
  "jitter_local": 0.0,
  "shimmer_local_db": 0.0,
  "hnr_db": 0.0,
  "f1_hz": 0.0,
  "f2_hz": 0.0,
  "f3_hz": 0.0
}
```

- [ ] **Step 2: Run the script manually to verify it fails before creation**

Run: `Praat.exe --run scripts/praat/analyze_voice.praat sample.wav output.json`
Expected: FAIL because the script does not exist.

- [ ] **Step 3: Write the first script version**

Implementation notes:
- Accept input and output paths as script arguments.
- Open the sound file.
- Compute the agreed metrics.
- Write a JSON-like text file or line-oriented key-value file that Python can parse reliably.
- Keep field names stable.

- [ ] **Step 4: Run manual script smoke test**

Run: `Praat.exe --run scripts/praat/analyze_voice.praat sample.wav output.json`
Expected: Output file is created with all required keys.

- [ ] **Step 5: Commit**

```bash
git add scripts/praat backend/tests/fixtures/audio/README.md
git commit -m "feat: add praat analysis script"
```

### Task 6: Wrap Praat execution in the backend

**Files:**
- Create: `backend/app/praat_runner.py`
- Modify: `backend/app/config.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing runner test**

```python
def test_builds_praat_command(tmp_path):
    runner = PraatRunner(praat_executable=Path("C:/Praat.exe"), script_path=Path("scripts/praat/analyze_voice.praat"))
    command = runner.build_command(tmp_path / "input.wav", tmp_path / "metrics.json")
    assert command == [
        "C:/Praat.exe",
        "--run",
        "scripts/praat/analyze_voice.praat",
        str(tmp_path / "input.wav"),
        str(tmp_path / "metrics.json"),
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_builds_praat_command -v`
Expected: FAIL because `PraatRunner` is missing.

- [ ] **Step 3: Write minimal command builder and subprocess wrapper**

```python
class PraatRunner:
    def build_command(self, input_audio: Path, output_metrics: Path) -> list[str]:
        return [
            str(self.praat_executable),
            "--run",
            str(self.script_path),
            str(input_audio),
            str(output_metrics),
        ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_builds_praat_command -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/praat_runner.py backend/app/config.py backend/tests/test_api.py
git commit -m "feat: add praat command runner"
```

## Chunk 4: Interpretation and Report Building

### Task 7: Define backend report models

**Files:**
- Create: `backend/app/models.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing model serialization test**

```python
def test_report_model_serializes_summary():
    report = VoiceReport(summary="Stable overall", metric_cards=[], recommendations=[])
    payload = report.model_dump()
    assert payload["summary"] == "Stable overall"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_report_model_serializes_summary -v`
Expected: FAIL because `VoiceReport` is undefined.

- [ ] **Step 3: Write Pydantic models**

```python
class MetricCard(BaseModel):
    key: str
    label: str
    value: str
    interpretation: str

class VoiceReport(BaseModel):
    summary: str
    confidence: str = "medium"
    metric_cards: list[MetricCard]
    recommendations: list[str]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_report_model_serializes_summary -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models.py backend/tests/test_api.py
git commit -m "feat: add report models"
```

### Task 8: Implement rules that transform metrics into suggestions

**Files:**
- Create: `backend/app/interpreter.py`
- Create: `backend/tests/test_interpreter.py`
- Create: `backend/tests/fixtures/metrics/stable_voice.json`
- Create: `backend/tests/fixtures/metrics/noisy_voice.json`

- [ ] **Step 1: Write the failing interpreter tests**

```python
def test_interpreter_flags_noisy_voice(noisy_metrics):
    report = build_report_from_metrics(noisy_metrics)
    assert any("noise" in item.lower() for item in report.recommendations)

def test_interpreter_summarizes_stable_voice(stable_metrics):
    report = build_report_from_metrics(stable_metrics)
    assert "stable" in report.summary.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_interpreter.py -v`
Expected: FAIL because the interpreter does not exist.

- [ ] **Step 3: Write minimal interpretation rules**

Implementation notes:
- Use conservative thresholds.
- Emit a summary, confidence tag, metric cards, and 3 to 5 recommendations.
- When metrics are missing, downgrade confidence and omit unsupported cards.
- Keep recommendation text actionable and short.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_interpreter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/interpreter.py backend/tests/test_interpreter.py backend/tests/fixtures/metrics
git commit -m "feat: add report interpretation rules"
```

### Task 9: Add a report builder that loads raw metrics and writes final JSON

**Files:**
- Create: `backend/app/report_builder.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing report builder test**

```python
def test_report_builder_writes_report_json(tmp_path, stable_metrics):
    metrics_path = tmp_path / "metrics.json"
    report_path = tmp_path / "report.json"
    metrics_path.write_text(json.dumps(stable_metrics), encoding="utf-8")
    build_report_file(metrics_path, report_path)
    payload = json.loads(report_path.read_text(encoding="utf-8"))
    assert payload["summary"]
    assert payload["metric_cards"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_report_builder_writes_report_json -v`
Expected: FAIL because `build_report_file` does not exist.

- [ ] **Step 3: Write minimal builder**

```python
def build_report_file(metrics_path: Path, report_path: Path) -> None:
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    report = build_report_from_metrics(metrics)
    report_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_report_builder_writes_report_json -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/report_builder.py backend/tests/test_api.py
git commit -m "feat: add report builder"
```

## Chunk 5: API Endpoints

### Task 10: Add upload-and-analyze endpoint

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/storage.py`
- Modify: `backend/app/audio_validation.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing API test**

```python
def test_create_analysis_task_returns_report(client, monkeypatch):
    response = client.post("/api/analysis", files={"file": ("sample.wav", b"fake", "audio/wav")})
    assert response.status_code == 201
    payload = response.json()
    assert payload["task_id"]
    assert payload["report"]["summary"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_create_analysis_task_returns_report -v`
Expected: FAIL because `/api/analysis` does not exist.

- [ ] **Step 3: Implement endpoint with dependency seams**

Implementation notes:
- Save uploaded file.
- Inspect metadata for validation.
- Invoke Praat runner through an injectable dependency.
- Build report JSON and return it inline for the MVP.
- Handle validation and runner failures with explicit error responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_create_analysis_task_returns_report -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/app/storage.py backend/app/audio_validation.py backend/tests/test_api.py
git commit -m "feat: add analysis API endpoint"
```

### Task 11: Add result retrieval endpoint

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the failing retrieval test**

```python
def test_get_analysis_report(client, tmp_task_report):
    response = client.get(f"/api/analysis/{tmp_task_report.task_id}")
    assert response.status_code == 200
    assert response.json()["task_id"] == tmp_task_report.task_id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_api.py::test_get_analysis_report -v`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement result loading**

Implementation notes:
- Look up the task directory by id.
- Return report JSON if present.
- Return 404 when the task is missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pytest tests/test_api.py::test_get_analysis_report -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_api.py
git commit -m "feat: add analysis retrieval endpoint"
```

## Chunk 6: Frontend Input Flow

### Task 12: Add API client and shared types

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/types.ts`

- [ ] **Step 1: Define TypeScript interfaces from backend report shape**

```ts
export interface VoiceReport {
  summary: string;
  confidence: string;
  metric_cards: MetricCard[];
  recommendations: string[];
}
```

- [ ] **Step 2: Verify TypeScript currently fails to compile references**

Run: `cd frontend; npm run build`
Expected: FAIL once components reference missing API and types.

- [ ] **Step 3: Implement the API wrapper**

Implementation notes:
- `createAnalysis(file: File): Promise<AnalysisResponse>`
- `getAnalysis(taskId: string): Promise<AnalysisResponse>`
- Keep the wrapper small and framework-agnostic.

- [ ] **Step 4: Run build to verify it passes**

Run: `cd frontend; npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api.ts frontend/src/types.ts
git commit -m "feat: add frontend api client"
```

### Task 13: Build recording and upload components

**Files:**
- Create: `frontend/src/components/Recorder.tsx`
- Create: `frontend/src/components/UploadForm.tsx`
- Create: `frontend/src/components/StatusBanner.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Define the manual acceptance checks**

Manual checks:
- User can grant microphone permission.
- User can record audio and stop recording.
- User can select a WAV file manually.
- UI shows clear status during recording and upload.

- [ ] **Step 2: Run app to confirm the controls do not exist yet**

Run: `cd frontend; npm run dev`
Expected: The page only shows the shell title.

- [ ] **Step 3: Implement the smallest usable input UI**

Implementation notes:
- Use `MediaRecorder` in `Recorder.tsx`.
- Emit a `Blob` or `File` to the parent.
- Keep upload and recording as two separate flows that feed the same submit action.
- Centralize transient UI state in `App.tsx`.

- [ ] **Step 4: Run app to verify the controls work manually**

Run: `cd frontend; npm run dev`
Expected: User can record or upload, and a selected sample is visible in the UI.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components frontend/src/App.tsx
git commit -m "feat: add recording and upload flow"
```

## Chunk 7: Frontend Report Rendering

### Task 14: Render analysis reports

**Files:**
- Create: `frontend/src/components/ReportView.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/app.css`

- [ ] **Step 1: Define the manual report acceptance checks**

Manual checks:
- Summary headline is visible.
- Metric cards show label, value, and explanation.
- Recommendation list shows 3 to 5 items.
- Confidence or warning banner is visible when provided.

- [ ] **Step 2: Run app to confirm report rendering is absent**

Run: `cd frontend; npm run dev`
Expected: No report view exists yet.

- [ ] **Step 3: Implement report rendering**

Implementation notes:
- Keep the initial layout simple.
- Use clear sections matching the spec.
- Support partial reports by hiding missing metric cards.

- [ ] **Step 4: Run app to verify report rendering manually**

Run: `cd frontend; npm run dev`
Expected: A mocked or real report displays correctly.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ReportView.tsx frontend/src/App.tsx frontend/src/app.css
git commit -m "feat: add report rendering"
```

### Task 15: Connect input flow to backend analysis

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/components/StatusBanner.tsx`

- [ ] **Step 1: Define the manual integration checks**

Manual checks:
- Submitting a selected sample triggers an API request.
- Loading state appears during submission.
- Validation errors show readable messages.
- Successful response replaces placeholder UI with a report.

- [ ] **Step 2: Run the integrated app to confirm submission is not wired**

Run: `cd frontend; npm run dev`
Expected: Controls exist but report submission is incomplete.

- [ ] **Step 3: Implement the submission flow**

Implementation notes:
- Lift selected file state to `App.tsx`.
- Call `createAnalysis`.
- Surface backend errors without exposing raw stack traces.
- Clear stale errors when a new submission starts.

- [ ] **Step 4: Run the integrated app to verify it works**

Run: `cd frontend; npm run dev`
Expected: A real backend response renders in the report view.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/api.ts frontend/src/components/StatusBanner.tsx
git commit -m "feat: wire frontend analysis submission"
```

## Chunk 8: Developer Experience and Verification

### Task 16: Add local startup script and setup docs

**Files:**
- Create: `scripts/dev/start.ps1`
- Create: `docs/setup/local-dev.md`

- [ ] **Step 1: Write the setup checklist**

Checklist items:
- Install Python
- Install Node.js
- Install Praat
- Configure Praat executable path
- Start backend
- Start frontend

- [ ] **Step 2: Verify no startup helper exists yet**

Run: `Get-ChildItem scripts/dev`
Expected: directory empty or missing helper script.

- [ ] **Step 3: Implement the startup script and docs**

Implementation notes:
- Script should launch backend and frontend in separate terminals or document sequential commands clearly.
- Docs must include Praat installation notes for Windows.
- Keep environment variables explicit.

- [ ] **Step 4: Run the helper to verify it starts the app**

Run: `powershell -ExecutionPolicy Bypass -File scripts/dev/start.ps1`
Expected: Backend and frontend start or the script prints exact commands if terminals are not spawned.

- [ ] **Step 5: Commit**

```bash
git add scripts/dev/start.ps1 docs/setup/local-dev.md
git commit -m "docs: add local startup workflow"
```

### Task 17: Run final verification for the MVP slice

**Files:**
- Modify: `docs/setup/local-dev.md`

- [ ] **Step 1: Run backend test suite**

Run: `cd backend; pytest -q`
Expected: PASS

- [ ] **Step 2: Run frontend production build**

Run: `cd frontend; npm run build`
Expected: PASS

- [ ] **Step 3: Run end-to-end manual smoke test**

Run:
- Start backend
- Start frontend
- Upload a sample WAV
- Confirm report renders

Expected:
- Healthcheck responds
- Analysis request succeeds
- Report shows summary, metric cards, and recommendations

- [ ] **Step 4: Update setup doc with any missing gotchas**

Update:
- Actual Praat path instructions
- Any known limitations found during smoke testing

- [ ] **Step 5: Commit**

```bash
git add docs/setup/local-dev.md
git commit -m "chore: finalize mvp verification notes"
```
