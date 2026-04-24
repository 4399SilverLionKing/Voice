"use client"

import { useState } from "react"

import {
  type AnalysisReport,
  createAnalysisTask,
  getAnalysisReport,
} from "@/lib/api"
import { Button } from "@/components/ui/button"

export function VoiceAnalysisApp() {
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit() {
    if (!file) {
      setError("请先选择一个 WAV 文件。")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setReport(null)

    try {
      const task = await createAnalysisTask(file)
      if (task.status === "failed") {
        throw new Error(task.error?.message ?? "分析任务失败。")
      }
      const nextReport = await getAnalysisReport(task.task_id)
      setReport(nextReport)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "提交失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh overflow-hidden bg-[radial-gradient(circle_at_10%_0%,oklch(0.92_0.12_130_/_0.32),transparent_34%),linear-gradient(135deg,oklch(0.99_0.01_96),oklch(0.96_0.04_145))] text-stone-950">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-lime-900/10 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-lime-900 shadow-sm backdrop-blur">
              Local Voice Analysis MVP
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-stone-950 md:text-7xl">
                把一段声音变成可读的练习线索
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-700">
                上传 3 到 15 秒的单人 WAV 干声音频，本地后端会保存任务、调用分析管线并生成谨慎的声学报告。
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-950/10 bg-white/70 p-5 shadow-2xl shadow-lime-950/10 backdrop-blur">
            <div className="rounded-[1.5rem] border border-dashed border-stone-950/20 bg-stone-50/80 p-6">
              <label className="block space-y-3">
                <span className="text-sm font-semibold text-stone-800">
                  选择 WAV 文件
                </span>
                <input
                  type="file"
                  accept=".wav,audio/wav,audio/wave"
                  className="block w-full rounded-xl border border-stone-950/10 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-lime-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null)
                    setError(null)
                  }}
                />
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="h-11 rounded-xl bg-lime-900 px-5 text-white hover:bg-lime-800"
                  disabled={isSubmitting}
                  onClick={submit}
                >
                  {isSubmitting ? "分析中..." : "开始分析"}
                </Button>
                <p className="text-sm text-stone-600">
                  后端会调用本机 Praat 执行声学分析，请保持 8000 端口服务运行。
                </p>
              </div>

              {file ? (
                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-stone-700">
                  已选择：{file.name}
                </p>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-stone-950/10 bg-stone-950 p-6 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">
              Report Shape
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              声学发生了什么，可能说明什么，下一步怎么练
            </h2>
            <p className="mt-4 leading-7 text-stone-300">
              MVP 不做医学判断，也不直接贴固定发声标签。报告只解释可测指标，并给出保守的练习建议。
            </p>
          </div>

          <div className="rounded-[2rem] border border-stone-950/10 bg-white/75 p-6 shadow-xl shadow-lime-950/5 backdrop-blur">
            {report ? (
              <ReportView report={report} />
            ) : (
              <div className="flex min-h-72 flex-col justify-center rounded-[1.5rem] border border-stone-950/10 bg-white/60 p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Waiting
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  报告会显示在这里
                </h2>
                <p className="mt-3 max-w-xl leading-7 text-stone-600">
                  上传成功后，你会看到总结、指标卡片、质量提示和 3 到 5 条可操作建议。
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-800">
          Confidence: {report.confidence}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          {report.summary}
        </h2>
      </div>

      {report.notices.length > 0 ? (
        <div className="space-y-2">
          {report.notices.map((notice) => (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              key={notice}
            >
              {notice}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {report.metrics.map((metric) => (
          <article
            className="rounded-2xl border border-stone-950/10 bg-white p-4"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-stone-800">{metric.label}</h3>
              <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-medium text-lime-900">
                {metric.status}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              {metric.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {metric.explanation}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl bg-lime-950 p-5 text-white">
        <h3 className="font-semibold">练习建议</h3>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-lime-50">
          {report.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
