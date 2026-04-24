from __future__ import annotations

from typing import Any

from .schemas import MetricValue, Report


def _format_number(value: Any, suffix: str = "", digits: int = 1) -> str:
    if value is None:
        return "未获得"
    if isinstance(value, int):
        return f"{value}{suffix}"
    if isinstance(value, float):
        return f"{value:.{digits}f}{suffix}"
    return f"{value}{suffix}"


def _notice_for_warnings(warnings: list[str]) -> list[str]:
    notices: list[str] = []
    if "no_reliable_pitch_track" in warnings:
        notices.append("音高轨迹不够可靠，音高相关结论需要谨慎参考。")
    if "too_few_voiced_frames" in warnings:
        notices.append("有效发声片段偏少，建议重新录制 3 到 15 秒的清晰干声音频。")
    return notices


def build_report(task_id: str, metrics: dict[str, Any]) -> Report:
    warnings = list(metrics.get("warnings") or [])
    notices = _notice_for_warnings(warnings)
    confidence = "medium" if notices else "high"
    if len(notices) >= 2:
        confidence = "low"

    voiced_duration = metrics.get("voiced_duration_sec")
    duration = metrics.get("duration_sec")
    mean_pitch = metrics.get("mean_pitch_hz")
    pitch_sd = metrics.get("pitch_sd_hz")
    jitter = metrics.get("jitter_local")
    shimmer = metrics.get("shimmer_local")
    hnr = metrics.get("hnr_db")
    formants = metrics.get("formants") or {}

    summary_parts = ["已完成基础声学读取。"]
    if voiced_duration and duration:
        summary_parts.append(f"有效发声约占整段音频的 {voiced_duration / duration:.0%}。")
    if mean_pitch:
        summary_parts.append("音高轮廓可用于做初步稳定性参考。")
    if notices:
        summary_parts.append("本次报告包含质量或配置提示，请优先阅读提示。")

    metric_cards = [
        MetricValue(
            label="音频时长",
            value=_format_number(duration, " 秒"),
            explanation="用于判断样本是否足够支撑一次短样本分析。",
        ),
        MetricValue(
            label="采样率",
            value=_format_number(metrics.get("sample_rate_hz"), " Hz", 0),
            explanation="采样率影响可分析频率范围，常见录音通常为 44100 Hz 或 48000 Hz。",
        ),
        MetricValue(
            label="有效发声时长",
            value=_format_number(voiced_duration, " 秒"),
            explanation="估计被识别为发声的片段长度；过短时报告可信度会下降。",
            status="notice" if voiced_duration and voiced_duration < 3 else "ok",
        ),
        MetricValue(
            label="平均基频",
            value=_format_number(mean_pitch, " Hz"),
            explanation="描述整体音高中心，不等同于音准判断或声部分类。",
        ),
        MetricValue(
            label="音高波动",
            value=_format_number(pitch_sd, " Hz"),
            explanation="反映音高轨迹的变化幅度，可作为稳定性线索。",
            status="notice" if pitch_sd and pitch_sd > 45 else "ok",
        ),
        MetricValue(
            label="Jitter",
            value=_format_number(jitter, "", 3),
            explanation="声带周期微小波动的指标，只能作为振动稳定性线索，不能用于诊断。",
            status="notice" if jitter and jitter > 0.02 else "ok",
        ),
        MetricValue(
            label="Shimmer",
            value=_format_number(shimmer, "", 3),
            explanation="振幅微小波动的指标，只能作为音质稳定性线索。",
            status="notice" if shimmer and shimmer > 0.12 else "ok",
        ),
        MetricValue(
            label="HNR",
            value=_format_number(hnr, " dB"),
            explanation="谐噪比越高通常表示周期性成分更明显，但需要结合录音质量判断。",
            status="notice" if hnr and hnr < 12 else "ok",
        ),
        MetricValue(
            label="共振峰 F1 / F2 / F3",
            value=(
                f"{_format_number(formants.get('f1_hz'), ' Hz', 0)} / "
                f"{_format_number(formants.get('f2_hz'), ' Hz', 0)} / "
                f"{_format_number(formants.get('f3_hz'), ' Hz', 0)}"
            ),
            explanation="共振峰只能提示共鸣倾向，不能直接判定具体发声技术。",
        ),
    ]

    recommendations = [
        "重新录制时尽量保持 3 到 15 秒、单人、无伴奏、少混响的干声音频。",
        "如果音高波动偏大，先用舒适音区做持续元音练习，再观察稳定性变化。",
        "如果 HNR 偏低或提示噪声较多，优先改善录音环境，再比较声学指标。",
        "把本报告当作练习参考，不要把单次指标理解为医学结论或固定发声标签。",
    ]

    return Report(
        task_id=task_id,
        summary=" ".join(summary_parts),
        confidence=confidence,
        notices=notices,
        metrics=metric_cards,
        recommendations=recommendations,
        raw_metrics=metrics,
    )
