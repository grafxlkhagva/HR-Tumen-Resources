export const INVITATION_EMAIL_TEMPLATE_DOC_ID = 'invitationEmailTemplate';

export const INVITATION_EMAIL_PLACEHOLDERS = [
  { key: '{{companyName}}', label: 'Байгууллагын нэр' },
  { key: '{{employeeName}}', label: 'Ажилтны нэр' },
  { key: '{{employeeCode}}', label: 'Ажилтны код' },
  // NOTE: системд нэвтрэх нэр = ажилтны код. (Backward compatible key)
  { key: '{{loginEmail}}', label: 'Нэвтрэх нэр (ажилтны код)' },
  { key: '{{password}}', label: 'Нууц үг' },
  { key: '{{appUrl}}', label: 'Системийн URL (жишээ: https://app.example.com)' },
  { key: '{{adminName}}', label: 'Бүртгэсэн админы нэр' },
];

/** Жишээ утгууд — урьдчилан харахад ашиглана */
export const INVITATION_EMAIL_PREVIEW_VARS: Record<string, string> = {
  companyName: 'Жишээ байгууллага',
  employeeName: 'Бат-Эрдэнэ',
  employeeCode: 'EMP0001',
  loginEmail: 'EMP0001',
  password: '••••••••',
  appUrl: 'https://hr.example.com',
  adminName: 'Системийн админ',
};

export const INVITATION_EMAIL_DEFAULT_SUBJECT = 'Таны нэвтрэх мэдээлэл - {{companyName}}';

export type InvitationEmailTemplateFields = {
  headerTitle: string; // usually {{companyName}}
  headerSubtitle: string;
  introText: string;
  securityTitle: string;
  securityText: string;
  helpText: string;
  footerAutoText: string;
  footerAdminLabel: string;
};

export const INVITATION_EMAIL_DEFAULT_FIELDS: InvitationEmailTemplateFields = {
  headerTitle: '{{companyName}}',
  headerSubtitle: 'Нэвтрэх мэдээлэл',
  introText:
    'Таныг {{companyName}} байгууллагын HR системд бүртгэлээ. Доорх мэдээлэл ашиглан системд нэвтрэх боломжтой.',
  securityTitle: '⚠️ Аюулгүй байдал:',
  securityText:
    'Энэ мэдээллийг хадгалж, хэнтэй ч хуваалцахгүй байхыг анхаарна уу. Нэвтрэх мэдээллээ нууц үгээр солихыг зөвлөж байна.',
  helpText: 'Асуулт байвал HR багтай холбогдоно уу.',
  footerAutoText: 'Энэ мэйл автоматаар илгээгдсэн. Хариу бичих шаардлагагүй.',
  footerAdminLabel: 'Бүртгэсэн:',
};

export function replacePlaceholders(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    text
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toHtmlText(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

/**
 * Талбаруудаас HTML загвар (placeholder-тэй) үүсгэнэ.
 * Дараа нь replacePlaceholders() ашиглан бодит утга руу солино.
 */
export function buildInvitationEmailHtmlFromFields(
  fields: InvitationEmailTemplateFields
): string {
  const headerTitle = toHtmlText(fields.headerTitle);
  const headerSubtitle = toHtmlText(fields.headerSubtitle);
  const introText = toHtmlText(fields.introText);
  const securityTitle = toHtmlText(fields.securityTitle);
  const securityText = toHtmlText(fields.securityText);
  const helpText = toHtmlText(fields.helpText);
  const footerAutoText = toHtmlText(fields.footerAutoText);
  const footerAdminLabel = toHtmlText(fields.footerAdminLabel);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-item { margin: 15px 0; }
    .label { font-weight: bold; color: #6b7280; font-size: 14px; }
    .value { font-size: 18px; color: #111827; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerTitle}</h1>
      <p>${headerSubtitle}</p>
    </div>
    <div class="content">
      <p>Сайн байна уу, <strong>{{employeeName}}</strong>,</p>
      <p>${introText}</p>

      <div class="credentials-box">
        <div class="credential-item">
          <div class="label">Ажилтны код:</div>
          <div class="value">{{employeeCode}}</div>
        </div>
        <div class="credential-item">
          <div class="label">Нэвтрэх нэр:</div>
          <div class="value">{{employeeCode}}</div>
        </div>
        <div class="credential-item">
          <div class="label">Нууц үг:</div>
          <div class="value">{{password}}</div>
        </div>
      </div>

      <div class="warning">
        <strong>${securityTitle}</strong> ${securityText}
      </div>

      <p>Системд нэвтрэх: <a href="{{appUrl}}/login">{{appUrl}}/login</a></p>
      <p>${helpText}</p>

      <div class="footer">
        <p>${footerAutoText}</p>
        <p>${footerAdminLabel} {{adminName}}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

