export type TaskSummary = {
  task_id: string
  status: "completed" | "failed"
  created_at: string
  input_file: string
  metrics_file?: string | null
  report_file?: string | null
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  } | null
}

export type AnalysisReport = {
  task_id: string
  summary: string
  confidence: "high" | "medium" | "low"
  notices: string[]
  metrics: Array<{
    label: string
    value: string
    explanation: string
    status: "ok" | "notice" | "warning"
  }>
  recommendations: string[]
  raw_metrics: Record<string, unknown>
}

export type AnalysisHistoryItem = TaskSummary & {
  summary: string
}

export type AiAnalysis = {
  task_id: string
  generated_at: string
  summary: string
  insights: string[]
  practice_suggestions: string[]
  cautions: string[]
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = payload?.detail
    const message =
      typeof detail === "string"
        ? detail
        : (detail?.message ?? `请求失败：${response.status}`)
    throw new Error(message)
  }

  return payload as T
}

export async function createAnalysisTask(file: File): Promise<TaskSummary> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    body: formData,
  })

  return parseApiResponse<TaskSummary>(response)
}

export async function getAnalysisReport(
  taskId: string
): Promise<AnalysisReport> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/report`)
  return parseApiResponse<AnalysisReport>(response)
}

export async function listAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  const response = await fetch("/api/history")
  const payload = await parseApiResponse<{ history: AnalysisHistoryItem[] }>(
    response
  )
  return payload.history
}

export async function getHistoryReport(
  taskId: string
): Promise<AnalysisReport> {
  const response = await fetch(`/api/history/${taskId}/report`)
  return parseApiResponse<AnalysisReport>(response)
}

export async function getAiAnalysis(
  taskId: string
): Promise<AiAnalysis | null> {
  const response = await fetch(`/api/history/${taskId}/ai-analysis`)

  if (response.status === 404) {
    return null
  }

  return parseApiResponse<AiAnalysis>(response)
}

export async function createAiAnalysis(
  taskId: string,
  force = false
): Promise<AiAnalysis> {
  const response = await fetch(`/api/history/${taskId}/ai-analysis`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ force }),
  })

  return parseApiResponse<AiAnalysis>(response)
}
