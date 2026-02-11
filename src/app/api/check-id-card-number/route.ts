import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';

function normalizeValue(value: string): string {
  return (value || '').trim().replace(/\s+/g, '');
}

function extractIndexUrl(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/https:\/\/[^\s)'"]+/);
  if (match) return match[0];
  const needsIndex = /index|RESOURCE_EXHAUSTED|create_composite|FAILED_PRECONDITION/i.test(msg);
  if (needsIndex) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
    if (projectId) {
      return `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idCardNumber, currentEmployeeId } = body;

    if (typeof idCardNumber !== 'string' || typeof currentEmployeeId !== 'string') {
      return NextResponse.json(
        { error: 'idCardNumber болон currentEmployeeId шаардлагатай.' },
        { status: 400 }
      );
    }

    const normalized = normalizeValue(idCardNumber);
    if (!normalized) {
      return NextResponse.json({ duplicate: false });
    }

    let db;
    try {
      db = getFirebaseAdminFirestore();
    } catch (adminError) {
      const msg = adminError instanceof Error ? adminError.message : String(adminError);
      if (/Firebase Admin env not configured|FIREBASE_ADMIN/i.test(msg)) {
        return NextResponse.json({ duplicate: false, skipped: true });
      }
      throw adminError;
    }

    const snapshot = await db
      .collectionGroup('questionnaire')
      .where('idCardNumber', '==', normalized)
      .get();

    for (const doc of snapshot.docs) {
      const pathParts = doc.ref.path.split('/');
      const employeeId = pathParts[1];
      if (employeeId && employeeId !== currentEmployeeId) {
        return NextResponse.json({
          duplicate: true,
          message: 'Энэ ТТД өөр ажилтанд бүртгэгдсэн байна.',
          existingEmployeeId: employeeId,
        });
      }
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    const indexUrl = extractIndexUrl(error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[check-id-card-number]', msg, error);

    if (indexUrl) {
      return NextResponse.json(
        {
          error: 'ТТД шалгалт ажиллахын тулд Firestore индекс үүсгэх шаардлагатай.',
          indexUrl,
        },
        { status: 503 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Татвар төлөгчийн дугаар шалгахад алдаа гарлаа.',
        ...(isDev && { detail: msg }),
      },
      { status: 500 }
    );
  }
}
