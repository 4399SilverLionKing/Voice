import { generateObject } from "ai"
import { createOpencode } from "ai-sdk-provider-opencode-sdk"
import { NextResponse, type NextRequest } from "next/server"
import path from "node:path"
import { z } from "zod"

import type { AiAnalysis } from "@/lib/api"
import {
  readAiAnalysis,
  readAnalysisReport,
  resolveProjectRoot,
  resolveTaskDir,
  writeAiAnalysis,
} from "@/lib/history-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const aiAnalysisSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()),
  practice_suggestions: z.array(z.string()),
  cautions: z.array(z.string()),
})

const DEFAULT_OPENCODE_MODEL = "cubence/gpt-5.5"

function jsonError(message: string, status: number) {
  return NextResponse.json({ detail: { message } }, { status })
}

function shouldAutoStartOpencodeServer() {
  if (process.env.OPENCODE_AUTO_START) {
    return process.env.OPENCODE_AUTO_START !== "false"
  }

  return !process.env.OPENCODE_BASE_URL
}

function buildOpencodeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "AI 分析生成失败。"

  if (message.includes("spawn EPERM")) {
    return [
      "OpenCode server 启动失败：当前 Node 进程没有权限 spawn OpenCode。",
      "可以手动启动 OpenCode server 后设置 OPENCODE_BASE_URL，或让 Next dev server 运行在允许启动子进程的终端中。",
    ].join(" ")
  }

  return message
}

async function parseForce(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "force" in payload &&
    payload.force
  )
}

function buildPrompt({ taskDir, taskId }: { taskDir: string; taskId: string }) {
  const relativeTaskDir = path.relative(resolveProjectRoot(), taskDir)

  return [
    "你是声音训练和录音质量分析助手。请直接读取项目中的分析结果文件，并基于这些文件生成中文 AI 分析。",
    "",
    `当前 task id: ${taskId}`,
    `分析结果目录: ${relativeTaskDir}`,
    "",
    "请优先读取这些文件（如果存在）：",
    `- ${relativeTaskDir}/report.json`,
    `- ${relativeTaskDir}/metrics.json`,
    `- ${relativeTaskDir}/input_metadata.json`,
    `- ${relativeTaskDir}/task.json`,
    "",
    "如果当前 OpenCode 环境中存在适用于声音、声乐、嗓音训练或报告解读的 agent 配置或技能规则，请按这些规则辅助分析。",
    "不要修改任何项目文件。不要做医学诊断。不要把一次短音频分析说成固定结论。",
    "输出应面向普通用户，具体、克制、可执行。",
  ].join("\n")
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params

  try {
    return NextResponse.json(await readAiAnalysis(taskId))
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Invalid task id"
        ? "Invalid task id"
        : "AI analysis not found"

    return jsonError(message, 404)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const force = await parseForce(request)

  try {
    await readAnalysisReport(taskId)

    if (!force) {
      const existing = await readAiAnalysis(taskId).catch(() => null)
      if (existing) {
        return NextResponse.json(existing)
      }
    }

    const projectRoot = resolveProjectRoot()
    const taskDir = resolveTaskDir(taskId)
    const provider = createOpencode({
      autoStartServer: shouldAutoStartOpencodeServer(),
      baseUrl: process.env.OPENCODE_BASE_URL,
      serverTimeout: Number(process.env.OPENCODE_SERVER_TIMEOUT_MS ?? 30000),
      defaultSettings: {
        agent: process.env.OPENCODE_AI_AGENT ?? "build",
        directory: projectRoot,
        logger: false,
        sessionTitle: `Voice AI analysis ${taskId}`,
      },
    })
    const model = provider(
      process.env.OPENCODE_AI_MODEL ?? DEFAULT_OPENCODE_MODEL,
      {
        createNewSession: true,
        directory: projectRoot,
        logger: false,
        outputFormatRetryCount: 2,
        sessionTitle: `Voice AI analysis ${taskId}`,
        systemPrompt:
          "你只能读取当前项目里的分析结果并生成解释。不要编辑、创建、删除或移动文件。",
      }
    )

    const { object } = await generateObject({
      model,
      schema: aiAnalysisSchema,
      prompt: buildPrompt({ taskDir, taskId }),
    })

    const analysis: AiAnalysis = {
      task_id: taskId,
      generated_at: new Date().toISOString(),
      ...object,
    }

    await writeAiAnalysis(analysis)
    return NextResponse.json(analysis)
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid task id") {
      return jsonError("Invalid task id", 400)
    }

    return jsonError(buildOpencodeErrorMessage(error), 500)
  }
}
