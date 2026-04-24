import { NextResponse } from "next/server"

import { listAnalysisHistory } from "@/lib/history-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const history = await listAnalysisHistory()
  return NextResponse.json({ history })
}
