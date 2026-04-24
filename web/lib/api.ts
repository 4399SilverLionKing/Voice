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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = payload?.detail
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `请求失败：${response.status}`
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
  taskId: string,
): Promise<AnalysisReport> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/report`)
  return parseApiResponse<AnalysisReport>(response)
}

