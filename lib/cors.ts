import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsResponse(
  data: Record<string, unknown>,
  options: { status?: number } = {}
) {
  return NextResponse.json(data, {
    status: options.status || 200,
    headers: corsHeaders,
  });
}

export function corsOptions() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
