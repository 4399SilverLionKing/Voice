# Praat 命令行调用文档

本文档说明本项目如何在 Windows 本地后端中调用 Praat 命令行，用于执行 `.praat` 脚本、分析音频文件并生成机器可读的指标文件。

参考资料：

- Praat Manual: [Scripting 6.9. Calling from the command line](https://praat.org/manual/Scripting_6_9__Calling_from_the_command_line.html)
- Praat Manual: [Scripting 6.1. Arguments to the script](https://praat.org/manual/Scripting_6_1__Arguments_to_the_script.html)

## 1. 推荐调用方式

本项目后端应使用 `--run` 在无 GUI 模式下执行 Praat 脚本：

```powershell
"C:\Program Files\Praat.exe" --run --no-pref-files --utf8 "scripts\praat\analyze_voice.praat" "data\tasks\<task_id>\input.wav" "data\tasks\<task_id>\metrics.json"
```

推荐参数含义：

- `--run`：执行脚本并在完成后退出，不打开 Praat GUI。
- `--no-pref-files`：不读取或写入用户偏好文件，适合由后端服务、批处理或 Web 服务调用。
- `--utf8`：让 Praat 的标准输出使用 UTF-8。Windows 下尤其建议启用，便于 Python 后端正确读取日志。
- 第一个位置参数：Praat 脚本路径。
- 后续位置参数：传给脚本 `form` 字段的参数，例如输入音频路径、输出指标路径。

不要省略 `--run`。Praat 官方文档说明，如果不显式指定 `--run`，在重定向、管道或间接调用场景下，Praat 可能选择打开文件而不是执行脚本。

## 2. 命令行模式说明

Praat 常用命令行开关如下：

```text
--open              打开文件或脚本，通常会启动 GUI
--new-open          启动新的 GUI 实例并打开文件
--run               无 GUI 执行脚本
--send              把脚本发送给已有或新的 GUI 实例执行
--new-send          启动新的 GUI 实例执行脚本
--version           输出 Praat 版本
--help              输出命令行帮助
--no-pref-files     不读写偏好文件和按钮文件
--no-plugins        启动时不加载插件
--utf8              使用 UTF-8 输出
--ansi              使用 ANSI 输出，不推荐
--utf16             使用 UTF-16LE 输出
```

本项目只建议使用 `--run --no-pref-files --utf8`。`--open`、`--send` 主要面向人工操作或 GUI 集成，不适合作为 Web 后端的稳定分析入口。

## 3. Praat 脚本参数约定

Praat 脚本可以通过 `form` 定义命令行参数。后端传入的位置参数会依次填入这些字段。

示例 `scripts/praat/analyze_voice.praat`：

```praat
form Analyze voice sample
    infile Input WAV file
    outfile Output metrics JSON
endform

Read from file: input_wav_file$
# 后续执行音频分析...
# 将结果写入 output_metrics_json$
```

字段变量命名规则：

- 字段名会被转换为变量名。
- 空格会变成下划线。
- 字符串字段变量以 `$` 结尾。
- `infile`、`outfile`、`folder` 类型通常会得到文件或目录路径字符串。

因此：

```praat
infile Input WAV file
outfile Output metrics JSON
```

在脚本中对应：

```praat
input_wav_file$
output_metrics_json$
```

## 4. 路径和引号规则

Windows 路径中经常包含空格，因此命令行调用时必须正确加引号：

```powershell
"& 'C:\Program Files\Praat.exe' --run --no-pref-files --utf8 'C:\Users\Admin\Desktop\Voice\scripts\praat\analyze_voice.praat' 'C:\Users\Admin\Desktop\Voice\data\tasks\abc123\input.wav' 'C:\Users\Admin\Desktop\Voice\data\tasks\abc123\metrics.json'"
```

更推荐在 Python 中使用参数列表调用，而不是拼接一个命令字符串。这样可以避免路径空格、转义字符和注入风险。

路径建议：

- 后端内部统一使用绝对路径调用 Praat。
- 任务目录使用 `data/tasks/<task_id>/`。
- 输入音频固定保存为 `input.wav`。
- Praat 原始指标固定输出为 `metrics.json`。
- 最终报告由后端生成并保存为 `report.json`。

## 5. Python / FastAPI 调用示例

推荐使用 `subprocess.run()`，并显式设置超时、工作目录、输出捕获和错误检查。

```python
from pathlib import Path
import subprocess


def run_praat_analysis(
    praat_exe: Path,
    script_path: Path,
    input_wav: Path,
    metrics_json: Path,
    project_root: Path,
) -> subprocess.CompletedProcess[str]:
    command = [
        str(praat_exe),
        "--run",
        "--no-pref-files",
        "--utf8",
        str(script_path),
        str(input_wav),
        str(metrics_json),
    ]

    return subprocess.run(
        command,
        cwd=str(project_root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=60,
        check=True,
    )
```

调用方应捕获这些异常：

```python
try:
    result = run_praat_analysis(
        praat_exe=praat_exe,
        script_path=script_path,
        input_wav=input_wav,
        metrics_json=metrics_json,
        project_root=project_root,
    )
except FileNotFoundError:
    # Praat.exe 不存在或路径配置错误
    ...
except subprocess.TimeoutExpired:
    # 分析耗时过长
    ...
except subprocess.CalledProcessError as exc:
    # Praat 返回非 0 退出码
    # exc.stdout / exc.stderr 可用于错误日志
    ...
```

后端不要只依赖退出码判断成功，还应检查：

- `metrics.json` 是否存在。
- `metrics.json` 是否是合法 JSON。
- 必需字段是否存在。
- 指标值是否在合理范围内。

## 6. 建议的脚本输入输出契约

Praat 脚本只负责声学指标提取，不负责面向用户的解释。

输入：

```text
input.wav
```

输出：

```json
{
  "duration_sec": 8.42,
  "sample_rate_hz": 44100,
  "voiced_duration_sec": 6.91,
  "mean_pitch_hz": 184.3,
  "pitch_sd_hz": 18.7,
  "jitter_local": 0.012,
  "shimmer_local": 0.087,
  "hnr_db": 17.4,
  "formants": {
    "f1_hz": 612.5,
    "f2_hz": 1480.2,
    "f3_hz": 2655.9
  },
  "warnings": []
}
```

建议保留 `warnings` 字段，用于 Praat 层报告低质量输入或部分指标缺失，例如：

```json
{
  "warnings": [
    "no_reliable_pitch_track",
    "too_few_voiced_frames"
  ]
}
```

最终用户可读报告应由后端解释引擎根据 `metrics.json` 生成，不应写死在 Praat 脚本里。

## 7. 标准输出和错误输出

Praat 在 `--run` 模式下：

- 原本写到 Info 窗口的内容会进入标准输出。
- 错误信息会进入标准错误。
- 脚本执行完成后 Praat 进程退出。

后端应将这些内容保存到任务目录，便于排查：

```text
data/tasks/<task_id>/praat_stdout.txt
data/tasks/<task_id>/praat_stderr.txt
```

注意：标准输出适合记录调试信息，不适合作为主要数据交换格式。主要结果应写入 `metrics.json`。

## 8. 后端配置建议

建议使用环境变量或配置文件保存 Praat 路径：

```text
PRAAT_EXE=C:\Program Files\Praat.exe
PRAAT_ANALYZE_SCRIPT=C:\Users\Admin\Desktop\Voice\scripts\praat\analyze_voice.praat
PRAAT_TIMEOUT_SECONDS=60
```

启动时应做一次轻量检查：

```powershell
"C:\Program Files\Praat.exe" --version
```

如果 Praat 不存在或不可执行，后端应返回明确错误，例如：

```json
{
  "error": "praat_not_configured",
  "message": "未找到 Praat.exe，请检查 PRAAT_EXE 配置。"
}
```

## 9. 错误处理建议

后端应把 Praat 调用错误转成稳定的业务错误码。

```text
praat_not_found             Praat.exe 路径不存在
praat_timeout               Praat 执行超时
praat_execution_failed      Praat 返回非 0 退出码
metrics_missing             未生成 metrics.json
metrics_invalid_json        metrics.json 不是合法 JSON
metrics_incomplete          指标缺失或部分提取失败
audio_no_voiced_segment     未检测到有效发声片段
audio_too_short             音频过短
audio_too_long              音频过长
audio_too_noisy             音频噪声过高
```

用户界面不应展示原始堆栈；原始 `stdout`、`stderr` 和异常信息应保存在本地任务日志中。

## 10. 测试命令

手动验证 Praat 是否可运行：

```powershell
"C:\Program Files\Praat.exe" --version
```

手动运行一次分析脚本：

```powershell
"C:\Program Files\Praat.exe" --run --no-pref-files --utf8 "C:\Users\Admin\Desktop\Voice\scripts\praat\analyze_voice.praat" "C:\Users\Admin\Desktop\Voice\data\tasks\manual-test\input.wav" "C:\Users\Admin\Desktop\Voice\data\tasks\manual-test\metrics.json"
```

验证输出文件：

```powershell
Test-Path "C:\Users\Admin\Desktop\Voice\data\tasks\manual-test\metrics.json"
Get-Content "C:\Users\Admin\Desktop\Voice\data\tasks\manual-test\metrics.json"
```

自动化测试建议覆盖：

- Praat 路径不存在。
- 输入 WAV 不存在。
- 输入音频太短。
- 正常样本能生成 `metrics.json`。
- Praat 返回非 0 退出码时，后端能返回稳定错误。
- `metrics.json` 缺字段时，解释引擎能给出低置信度或部分报告。

## 11. 常见问题排查

### 11.1 找不到 Praat.exe

确认安装路径，并优先使用绝对路径：

```powershell
Test-Path "C:\Program Files\Praat.exe"
```

如果安装在其他目录，更新 `PRAAT_EXE`。

### 11.2 路径中有空格导致失败

PowerShell 手动调用时给路径加引号。Python 后端中使用 `subprocess.run([...])` 参数列表，不要拼接字符串命令。

### 11.3 后端读取日志乱码

Windows 下调用时加入 `--utf8`，Python 中设置：

```python
text=True
encoding="utf-8"
```

### 11.4 Praat 弹出 GUI 或没有执行脚本

检查是否显式传入 `--run`。不要依赖 `Praat.exe script.praat ...` 这种隐式行为。

### 11.5 没有生成 metrics.json

检查：

- Praat 是否返回非 0 退出码。
- `stderr` 是否包含脚本语法错误。
- 输出目录是否存在。
- 脚本中的 `outfile` 变量名是否和 `form` 字段一致。
- 输入 WAV 是否是 Praat 可读取的格式。

## 12. 本项目推荐约定

项目中建议固定使用以下命令模板：

```text
<PRAAT_EXE> --run --no-pref-files --utf8 <SCRIPT_PATH> <INPUT_WAV> <METRICS_JSON>
```

后端责任：

- 创建任务目录。
- 保存上传音频为 `input.wav`。
- 调用 Praat。
- 保存 `stdout` 和 `stderr`。
- 校验 `metrics.json`。
- 生成最终 `report.json`。

Praat 脚本责任：

- 读取输入 WAV。
- 提取原始声学指标。
- 写出稳定格式的 `metrics.json`。
- 不生成用户解释性文案。

解释引擎责任：

- 根据指标生成摘要、风险提示和练习建议。
- 对低质量输入给出置信度提示。
- 避免医学诊断或过度确定的发声技术判断。
