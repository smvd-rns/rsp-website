import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing audio id' }, { status: 400 });
  }

  const targetUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
  const range = req.headers.get('range');

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
  if (range) {
    headers['Range'] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, { headers });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse('Failed to fetch audio stream', {
        status: upstreamRes.status,
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      'Content-Type',
      upstreamRes.headers.get('content-type') || 'audio/mpeg',
    );
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800',
    );

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Audio streaming proxy error:', error);
    return new NextResponse('Audio stream error', { status: 502 });
  }
}
