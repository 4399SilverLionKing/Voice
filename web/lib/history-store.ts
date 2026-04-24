import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { AiAnalysis, AnalysisReport, TaskSummary } from "@/lib/api"

export type HistoryItem = TaskSummary & {
  summary: string
}

const TASK_ID_PATTERN = /^[a-f0-9]{32}$/i

function getDataDir() {
  return path.resolve(
    process.env.VOICE_DATA_DIR ??
      path.join(process.cwd(), "..", "data", "tasks")
  )
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function isSafeTaskId(taskId: string) {
  return TASK_ID_PATTERN.test(taskId)
}

export async function listAnalysisHistory(
  dataDir = getDataDir()
): Promise<HistoryItem[]> {
  const entries = await readdir(dataDir, { withFileTypes: true }).catch(
    () => []
  )
  const items = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && isSafeTaskId(entry.name))
      .map(async (entry) => {
        const taskDir = path.join(dataDir, entry.name)
        try {
          const task = await readJson<TaskSummary>(
            path.join(taskDir, "task.json")
          )
          const report =
            task.status === "completed"
              ? await readJson<AnalysisReport>(
                  path.join(taskDir, "report.json")
                ).catch(() => null)
              : null

          return {
            ...task,
            summary:
              report?.summary ??
              task.error?.message ??
              (task.status === "completed" ? "已完成" : "分析失败"),
          }
        } catch {
          return null
        }
      })
  )

  return items
    .filter((item): item is HistoryItem => item !== null)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
    )
}

export async function readAnalysisReport(
  taskId: string,
  dataDir = getDataDir()
): Promise<AnalysisReport> {
  if (!isSafeTaskId(taskId)) {
    throw new Error("Invalid task id")
  }

  return readJson<AnalysisReport>(path.join(dataDir, taskId, "report.json"))
}

export function resolveProjectRoot() {
  return path.resolve(process.cwd(), "..")
}

export function resolveTaskDir(taskId: string, dataDir = getDataDir()) {
  if (!isSafeTaskId(taskId)) {
    throw new Error("Invalid task id")
  }

  return path.join(dataDir, taskId)
}

export async function readAiAnalysis(
  taskId: string,
  dataDir = getDataDir()
): Promise<AiAnalysis> {
  return readJson<AiAnalysis>(
    path.join(resolveTaskDir(taskId, dataDir), "ai-analysis.json")
  )
}

export async function writeAiAnalysis(
  analysis: AiAnalysis,
  dataDir = getDataDir()
) {
  await writeJson(
    path.join(resolveTaskDir(analysis.task_id, dataDir), "ai-analysis.json"),
    analysis
  )
}
