import { NextResponse, type NextRequest } from "next/server"

import { readAnalysisReport } from "@/lib/history-store"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params

  try {
    return NextResponse.json(await readAnalysisReport(taskId))
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Invalid task id"
        ? "Invalid task id"
        : "Report not found"

    return NextResponse.json({ error: message }, { status: 404 })
  }
}
