# Voice Analysis Server

本目录是本地声音分析 MVP 的 FastAPI 后端。

## 启动

```powershell
cd C:\Users\Admin\Desktop\Voice\server
uv sync
uv run python run.py
```

如果当前 Windows 环境里 `uv run` 报 `Failed to query Python interpreter`，可直接使用已创建的虚拟环境启动：

```powershell
.\.venv\Scripts\python.exe run.py
```

本机 `server/.env` 已配置 `PRAAT_EXE=E:\Praat\Praat.exe`，后端启动后会直接调用真实 Praat 分析链路。

如需临时覆盖 Praat 配置：

```powershell
$env:PRAAT_EXE="E:\Praat\Praat.exe"
$env:PRAAT_SCRIPT="C:\Users\Admin\Desktop\Voice\scripts\praat\analyze_voice.praat"
.\.venv\Scripts\python.exe run.py
```

## API

- `GET /health`：健康检查和运行模式。
- `POST /api/tasks`：上传 WAV 文件并创建分析任务。
- `GET /api/tasks/{task_id}`：读取任务状态。
- `GET /api/tasks/{task_id}/report`：读取分析报告。
