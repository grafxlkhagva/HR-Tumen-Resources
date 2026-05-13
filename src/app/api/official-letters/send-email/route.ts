import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { OfficialLetterConfig } from '@/app/dashboard/official-letters/types';

export const maxDuration = 60;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * POST /api/official-letters/send-email
 * Албан бичгийг имэйлээр илгээнэ. Config-ийг letterId-ээр Firestore-аас уншиж
 * сервер талд бэлдэнэ (client tampering хамгаалал).
 */
export async function POST(request: NextRequest) {
    const { toEmail, letterId } = (await request.json()) as {
        toEmail: string;
        letterId: string;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!toEmail || !emailRegex.test(toEmail)) {
        return NextResponse.json({ error: 'Имэйл хаяг буруу байна' }, { status: 400 });
    }
    if (!letterId) {
        return NextResponse.json({ error: 'letterId шаардлагатай' }, { status: 400 });
    }

    const letterRef = doc(firestore, 'official_letters', letterId);
    const letterSnap = await getDoc(letterRef);
    if (!letterSnap.exists()) {
        return NextResponse.json({ error: 'Баримт олдсонгүй' }, { status: 404 });
    }

    const letterData = letterSnap.data() as { config?: OfficialLetterConfig };
    const config = letterData.config;
    if (!config) {
        return NextResponse.json(
            { error: 'Баримтын тохиргоо алдаатай байна' },
            { status: 400 },
        );
    }

    const formattedDate = config.docDate ? config.docDate.replace(/-/g, '.') : '';
    const safeContent = String(config.content || '');
    const subject = `[${escapeHtml(config.docIndex || 'АБ')}] ${escapeHtml(config.subject || 'Албан бичиг')} — ${escapeHtml(config.orgName)}`;

    const textBody = [
        `${config.orgName || ''} | ${config.orgTagline || ''}`,
        [config.address, config.phone && `Утас: ${config.phone}`, config.email && `И-мэйл: ${config.email}`]
            .filter(Boolean)
            .join(' · '),
        '',
        `Огноо: ${formattedDate}    №: ${config.docIndex || '—'}`,
        config.tanaiRef ? `Танай: ${config.tanaiRef}    №: ${config.tanaiNo || '—'}` : '',
        `Хэнд: ${config.addresseeOrg || ''} — ${config.addresseeName || ''}`,
        '',
        `Гарчиг: ${config.subject || ''}`,
        '',
        safeContent,
        '',
        `${config.signPosition || ''}    ${config.signName || ''}`,
    ]
        .filter((l) => l !== null && l !== undefined)
        .join('\n');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; padding: 2rem; }
  .header { text-align: center; margin-bottom: 1.5rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
  .org-name { font-size: 1.3rem; font-weight: 800; text-transform: uppercase; }
  .tagline { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .contacts { font-size: 0.8rem; margin-top: 0.5rem; }
  .meta { margin: 1rem 0; font-size: 0.85rem; }
  .subject { font-weight: 700; text-transform: uppercase; margin: 1.5rem 0; text-align: center; }
  .content { text-align: justify; }
  .content p { text-indent: 1.25cm; margin-bottom: 0.75rem; }
  .signature { margin-top: 3rem; display: flex; justify-content: space-between; font-weight: 700; }
  .footer { margin-top: 2rem; font-size: 0.75rem; color: #666; border-top: 1px solid #ccc; padding-top: 0.5rem; }
</style></head>
<body>
  <div class="header">
    <div class="org-name">${escapeHtml(config.orgName)}</div>
    <div class="tagline">${escapeHtml(config.orgTagline)}</div>
    <div class="contacts">
      ${escapeHtml(config.address)}<br/>
      Утас: ${escapeHtml(config.phone)} | И-мэйл: ${escapeHtml(config.email)}${config.web ? ` | Вэб: ${escapeHtml(config.web)}` : ''}
    </div>
  </div>
  <div class="meta">
    <strong>Огноо:</strong> ${escapeHtml(formattedDate)}&nbsp;&nbsp;&nbsp;
    <strong>№:</strong> ${escapeHtml(config.docIndex || '—')}<br/>
    ${config.tanaiRef ? `<strong>Танай:</strong> ${escapeHtml(config.tanaiRef)}&nbsp;&nbsp;<strong>№:</strong> ${escapeHtml(config.tanaiNo || '—')}<br/>` : ''}
    <strong>Хэнд:</strong> ${escapeHtml(config.addresseeOrg)} — ${escapeHtml(config.addresseeName)}
  </div>
  <div class="subject">${escapeHtml(config.subject)}</div>
  <div class="content">
    ${safeContent.split('\n').filter((p) => p.trim()).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
  </div>
  <div class="signature">
    <span>${escapeHtml(config.signPosition)}</span>
    <span>_______________</span>
    <span>${escapeHtml(config.signName)}</span>
  </div>
  <div class="footer">Энэ имэйл албан бичгийн системээс автоматаар илгээгдсэн.</div>
</body>
</html>`;

    if (!resend) {
        console.warn('[official-letters/send-email] RESEND_API_KEY байхгүй — симуляц.');
        return NextResponse.json({ success: true, simulated: true });
    }

    try {
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: [toEmail],
            subject,
            html: htmlBody,
            text: textBody,
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Имэйл илгээхэд алдаа гарлаа';
        console.error('[official-letters/send-email]', e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
