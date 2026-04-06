import { NextRequest, NextResponse } from 'next/server';
import { validateInteractiveHtml } from '../../../../lib/interactive';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { html?: string };
  if (!body.html?.trim()) {
    return NextResponse.json(
      { success: false, error: 'MISSING_REQUIRED_FIELD', details: 'html is required' },
      { status: 400 },
    );
  }
  return NextResponse.json({
    success: true,
    data: validateInteractiveHtml(body.html),
  });
}
