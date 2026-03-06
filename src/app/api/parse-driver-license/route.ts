import { NextRequest, NextResponse } from 'next/server';
import { extractDriverLicenseFromImages } from '@/ai/driver-license-ocr';

async function urlToDataUrl(imageUrl: string): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await fetch(imageUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Зургийн URL татахад алдаа: ${res.status}`);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString('base64');
  const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  return { dataUrl: `data:${mimeType};base64,${base64}`, mimeType };
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      frontImageDataUrl,
      frontMimeType,
      frontImageUrl,
      backImageDataUrl,
      backMimeType,
      backImageUrl,
    } = body as {
      frontImageDataUrl?: string;
      frontMimeType?: string;
      frontImageUrl?: string;
      backImageDataUrl?: string;
      backMimeType?: string;
      backImageUrl?: string;
    };

    let frontDataUrl: string;
    let frontType: string;
    if (frontImageDataUrl && frontImageDataUrl.startsWith('data:')) {
      frontDataUrl = frontImageDataUrl;
      frontType = frontMimeType || frontImageDataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
    } else if (frontImageUrl && typeof frontImageUrl === 'string') {
      const r = await urlToDataUrl(frontImageUrl);
      frontDataUrl = r.dataUrl;
      frontType = r.mimeType;
    } else {
      return NextResponse.json(
        { error: 'Жолооны үнэмлэхний урд талын зураг оруулна уу (frontImageDataUrl эсвэл frontImageUrl).' },
        { status: 400 }
      );
    }

    let backDataUrl: string | undefined;
    let backType: string | undefined;
    if (backImageDataUrl && backImageDataUrl.startsWith('data:')) {
      backDataUrl = backImageDataUrl;
      backType = backMimeType || backImageDataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
    } else if (backImageUrl && typeof backImageUrl === 'string') {
      const r = await urlToDataUrl(backImageUrl);
      backDataUrl = r.dataUrl;
      backType = r.mimeType;
    }

    const data = await extractDriverLicenseFromImages(
      frontDataUrl,
      frontType,
      backDataUrl,
      backType
    );

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('parse-driver-license API error:', err);
    const message =
      err instanceof Error ? err.message : 'Жолооны үнэмлэх танихад алдаа гарлаа';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
