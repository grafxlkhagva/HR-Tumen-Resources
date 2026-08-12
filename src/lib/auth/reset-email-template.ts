import { OTP_TTL_MS } from './password-reset';

/**
 * Нууц үг сэргээх OTP имэйлийн агуулга (Монгол, брэндлэгдсэн, inline CSS).
 * Гадны нөөц татахгүй — бүх стиль inline.
 */
export function buildOtpEmail(otp: string): { subject: string; html: string; text: string } {
    const minutes = Math.round(OTP_TTL_MS / 60000);
    const subject = `Нууц үг сэргээх код: ${otp}`;

    const text = [
        'Түмэн Тээх — Дотоод удирдлагын систем',
        '',
        'Таны нууц үг сэргээх баталгаажуулах код:',
        '',
        `    ${otp}`,
        '',
        `Энэ код ${minutes} минутын дараа хүчингүй болно.`,
        'Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу — таны нууц үг өөрчлөгдөхгүй.',
    ].join('\n');

    const html = `<!doctype html>
<html lang="mn">
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1E223E;padding:24px 28px;">
            <div style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:-0.01em;">Түмэн Тээх</div>
            <div style="color:#EE9A72;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px;">Дотоод удирдлагын систем</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 8px;font-size:18px;color:#1E223E;font-weight:600;">Нууц үг сэргээх</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5b6472;">Доорх баталгаажуулах кодыг системд оруулж, шинэ нууц үгээ тохируулна уу.</p>
            <div style="text-align:center;margin:8px 0 20px;">
              <div style="display:inline-block;background:#f5f5f7;border:1px solid #e6e9ef;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:700;letter-spacing:0.32em;color:#1E223E;">${otp}</div>
            </div>
            <p style="margin:0 0 4px;font-size:13px;color:#8a92a0;">Энэ код <strong style="color:#5b6472;">${minutes} минут</strong>-ын дараа хүчингүй болно.</p>
            <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#a0a6b2;border-top:1px solid #eef0f4;padding-top:16px;">Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу — таны нууц үг өөрчлөгдөхгүй.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { subject, html, text };
}
