"use client"

import { useCallback, useEffect, useState } from "react"

import {
  type AiAnalysis,
  type AnalysisHistoryItem,
  type AnalysisReport,
  createAiAnalysis,
  createAnalysisTask,
  getAiAnalysis,
  getHistoryReport,
  getAnalysisReport,
  listAnalysisHistory,
} from "@/lib/api"
import { Button } from "@/components/ui/button"

export function VoiceAnalysisApp() {
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false)
  const [isGeneratingAiAnalysis, setIsGeneratingAiAnalysis] = useState(false)

  const refreshHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      setHistory(await listAnalysisHistory())
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "历史加载失败。"
      )
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      try {
        const nextHistory = await listAnalysisHistory()
        if (isMounted) {
          setHistory(nextHistory)
        }
      } catch (nextError) {
        if (isMounted) {
          setError(
            nextError instanceof Error ? nextError.message : "历史加载失败。"
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false)
        }
      }
    }

    void loadHistory()
    const intervalId = setInterval(() => void loadHistory(), 15000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  function startNewSession() {
    setFile(null)
    setAiAnalysis(null)
    setError(null)
    setIsUploadDialogOpen(true)
  }

  function closeUploadDialog() {
    if (isSubmitting) {
      return
    }

    setFile(null)
    setError(null)
    setIsUploadDialogOpen(false)
  }

  async function submit() {
    if (!file) {
      setError("请先选择一个 WAV 文件。")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setReport(null)
    setAiAnalysis(null)

    try {
      const task = await createAnalysisTask(file)
      if (task.status === "failed") {
        setActiveTaskId(task.task_id)
        setFile(null)
        setIsUploadDialogOpen(false)
        await refreshHistory()
        throw new Error(task.error?.message ?? "分析任务失败。")
      }
      const nextReport = await getAnalysisReport(task.task_id)
      setReport(nextReport)
      setActiveTaskId(task.task_id)
      setFile(null)
      setIsUploadDialogOpen(false)
      await refreshHistory()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "提交失败。")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function openHistoryItem(item: AnalysisHistoryItem) {
    setActiveTaskId(item.task_id)
    setFile(null)
    setAiAnalysis(null)
    setIsUploadDialogOpen(false)
    setError(null)

    if (item.status === "failed") {
      setReport(null)
      setError(item.error?.message ?? "这条分析失败，没有报告。")
      return
    }

    setIsLoadingReport(true)
    try {
      const nextReport = await getHistoryReport(item.task_id)
      setReport(nextReport)
      setIsLoadingAiAnalysis(true)
      setAiAnalysis(await getAiAnalysis(item.task_id))
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "报告加载失败。"
      )
    } finally {
      setIsLoadingReport(false)
      setIsLoadingAiAnalysis(false)
    }
  }

  async function runAiAnalysis(force = false) {
    const taskId = activeTaskId ?? report?.task_id
    if (!taskId) {
      setError("请先选择一条已完成报告。")
      return
    }

    setError(null)
    setIsGeneratingAiAnalysis(true)
    try {
      setAiAnalysis(await createAiAnalysis(taskId, force))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI 分析失败。")
    } finally {
      setIsGeneratingAiAnalysis(false)
    }
  }

  return (
    <main className="min-h-svh bg-neutral-50 text-neutral-950">
      <div className="grid min-h-svh lg:grid-cols-[300px_1fr]">
        <HistorySidebar
          activeTaskId={activeTaskId}
          history={history}
          isLoading={isLoadingHistory}
          isUploadDialogOpen={isUploadDialogOpen}
          onNewSession={startNewSession}
          onSelect={openHistoryItem}
        />

        <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <header className="flex flex-col gap-1 border-b border-neutral-200 pb-4">
              <h1 className="text-2xl font-semibold">声音分析</h1>
              <p className="text-sm text-neutral-500">查看报告和历史记录。</p>
            </header>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              {isLoadingReport ? (
                <EmptyReport text="正在加载报告..." />
              ) : report ? (
                <ReportView
                  aiAnalysis={aiAnalysis}
                  isGeneratingAiAnalysis={isGeneratingAiAnalysis}
                  isLoadingAiAnalysis={isLoadingAiAnalysis}
                  onGenerateAiAnalysis={() => void runAiAnalysis(false)}
                  onRegenerateAiAnalysis={() => void runAiAnalysis(true)}
                  report={report}
                />
              ) : (
                <EmptyReport text="从历史中选择报告，或新增 session 上传音频" />
              )}
            </section>
          </div>
        </section>
      </div>

      {isUploadDialogOpen ? (
        <UploadDialog
          error={error}
          file={file}
          isSubmitting={isSubmitting}
          onClose={closeUploadDialog}
          onFileChange={(nextFile) => {
            setFile(nextFile)
            setError(null)
          }}
          onSubmit={submit}
        />
      ) : null}
    </main>
  )
}

function HistorySidebar({
  activeTaskId,
  history,
  isLoading,
  isUploadDialogOpen,
  onNewSession,
  onSelect,
}: {
  activeTaskId: string | null
  history: AnalysisHistoryItem[]
  isLoading: boolean
  isUploadDialogOpen: boolean
  onNewSession: () => void
  onSelect: (item: AnalysisHistoryItem) => Promise<void>
}) {
  return (
    <aside className="border-b border-neutral-200 bg-white lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <h2 className="text-base font-semibold">历史分析</h2>
          <Button
            className={[
              "h-8 px-3",
              isUploadDialogOpen
                ? "bg-neutral-900 text-white hover:bg-neutral-800"
                : "",
            ].join(" ")}
            onClick={onNewSession}
            variant={isUploadDialogOpen ? "default" : "outline"}
          >
            new session
          </Button>
        </div>

        <div className="max-h-72 overflow-auto p-2 lg:max-h-none lg:flex-1">
          {isLoading ? (
            <p className="px-2 py-6 text-sm text-neutral-500">加载中...</p>
          ) : history.length === 0 ? (
            <p className="px-2 py-6 text-sm text-neutral-500">暂无历史</p>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((item) => (
                <button
                  className={[
                    "rounded-lg border px-3 py-3 text-left transition",
                    activeTaskId === item.task_id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-transparent text-neutral-800 hover:border-neutral-200 hover:bg-neutral-50",
                  ].join(" ")}
                  key={item.task_id}
                  onClick={() => void onSelect(item)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {formatHistoryTime(item.created_at)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p
                    className={[
                      "mt-1 line-clamp-2 text-xs leading-5",
                      activeTaskId === item.task_id
                        ? "text-neutral-200"
                        : "text-neutral-500",
                    ].join(" ")}
                  >
                    {item.summary}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function UploadDialog({
  error,
  file,
  isSubmitting,
  onClose,
  onFileChange,
  onSubmit,
}: {
  error: string | null
  file: File | null
  isSubmitting: boolean
  onClose: () => void
  onFileChange: (file: File | null) => void
  onSubmit: () => Promise<void>
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
      role="dialog"
    >
      <form
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">new session</h2>
            <p className="mt-1 text-sm text-neutral-500">上传 WAV 音频。</p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-md px-2 py-1 text-xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-medium text-neutral-700">WAV 文件</span>
          <input
            type="file"
            accept=".wav,audio/wav,audio/wave"
            className="block w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            disabled={isSubmitting}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>

        {file ? (
          <p className="mt-3 truncate text-sm text-neutral-500">
            已选择：{file.name}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            取消
          </Button>
          <Button
            className="bg-neutral-900 px-4 text-white hover:bg-neutral-800"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "分析中..." : "开始分析"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function StatusBadge({ status }: { status: AnalysisHistoryItem["status"] }) {
  return (
    <span
      className={[
        "shrink-0 rounded-md px-2 py-0.5 text-xs",
        status === "completed"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-red-100 text-red-700",
      ].join(" ")}
    >
      {status === "completed" ? "完成" : "失败"}
    </span>
  )
}

function EmptyReport({ text }: { text: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center text-sm text-neutral-500">
      {text}
    </div>
  )
}

function ReportView({
  aiAnalysis,
  isGeneratingAiAnalysis,
  isLoadingAiAnalysis,
  onGenerateAiAnalysis,
  onRegenerateAiAnalysis,
  report,
}: {
  aiAnalysis: AiAnalysis | null
  isGeneratingAiAnalysis: boolean
  isLoadingAiAnalysis: boolean
  onGenerateAiAnalysis: () => void
  onRegenerateAiAnalysis: () => void
  report: AnalysisReport
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{report.summary}</h2>
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                {report.confidence}
              </span>
            </div>
          </div>
          <Button
            className="self-start"
            disabled={isGeneratingAiAnalysis}
            onClick={aiAnalysis ? onRegenerateAiAnalysis : onGenerateAiAnalysis}
            type="button"
            variant={aiAnalysis ? "outline" : "default"}
          >
            {isGeneratingAiAnalysis
              ? "AI 分析中..."
              : aiAnalysis
                ? "重新 AI 分析"
                : "AI 分析"}
          </Button>
        </div>
      </div>

      {report.notices.length > 0 ? (
        <div className="space-y-2">
          {report.notices.map((notice) => (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
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
            className="rounded-lg border border-neutral-200 bg-white p-4"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-neutral-800">{metric.label}</h3>
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                {metric.status}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {metric.explanation}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="font-semibold">练习建议</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {report.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </div>

      <AiAnalysisView
        analysis={aiAnalysis}
        isGenerating={isGeneratingAiAnalysis}
        isLoading={isLoadingAiAnalysis}
      />
    </div>
  )
}

function AiAnalysisView({
  analysis,
  isGenerating,
  isLoading,
}: {
  analysis: AiAnalysis | null
  isGenerating: boolean
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        正在读取 AI 分析...
      </div>
    )
  }

  if (isGenerating && !analysis) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        OpenCode 正在读取本地分析结果...
      </div>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">AI 分析</h3>
        <span className="text-xs text-neutral-500">
          {formatHistoryTime(analysis.generated_at)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-700">
        {analysis.summary}
      </p>

      <AiAnalysisList title="关键观察" items={analysis.insights} />
      <AiAnalysisList title="练习方向" items={analysis.practice_suggestions} />
      <AiAnalysisList title="注意事项" items={analysis.cautions} />
    </section>
  )
}

function AiAnalysisList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-neutral-800">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function formatHistoryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
