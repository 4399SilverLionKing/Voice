from __future__ import annotations

import wave
from pathlib import Path


class AudioValidationError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def read_wav_metadata(path: Path) -> dict[str, float | int]:
    try:
        with wave.open(str(path), "rb") as wav:
            frames = wav.getnframes()
            sample_rate = wav.getframerate()
            channels = wav.getnchannels()
            sample_width = wav.getsampwidth()
    except wave.Error as exc:
        raise AudioValidationError("audio_invalid_wav", "请上传标准 WAV 音频文件。") from exc

    if sample_rate <= 0:
        raise AudioValidationError("audio_invalid_wav", "WAV 文件采样率无效。")

    duration_sec = frames / sample_rate
    if duration_sec < 0.5:
        raise AudioValidationError("audio_too_short", "音频过短，至少需要 0.5 秒用于 MVP 分析。")
    if duration_sec > 60:
        raise AudioValidationError("audio_too_long", "音频过长，当前 MVP 最多支持 60 秒。")

    return {
        "duration_sec": round(duration_sec, 3),
        "sample_rate_hz": sample_rate,
        "channels": channels,
        "sample_width_bytes": sample_width,
    }

