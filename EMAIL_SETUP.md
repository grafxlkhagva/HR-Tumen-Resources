# Email Service Тохируулалт (Resend)

Энэ зааварчилгаа нь HR системд бодит email илгээх боломжийг тохируулах талаарх мэдээлэл юм.

## Алхам 1: Resend бүртгэл үүсгэх

1. [Resend.com](https://resend.com) руу очоод бүртгэл үүсгэнэ үү
2. Email verification хийх (имэйл рүү ирсэн холбоос дээр дарах)

## Алхам 2: API Key авах

1. [Resend Dashboard](https://resend.com/api-keys) руу очоод нэвтрэнэ үү
2. "Create API Key" товчлуур дээр дарах
3. API key-д нэр өгөх (жишээ: "HR System Production")
4. API key-г хуулж авна (энэ нь зөвхөн нэг удаа харагдана!)

## Алхам 3: Environment Variable тохируулах

`.env.local` файлд дараах мэдээллийг нэмнэ:

```bash
# Resend API Key (заавал шаардлагатай)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Custom from email address (Resend дээр verify хийсэн байх ёстой)
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Анхаар:** 
- `RESEND_API_KEY` нь `re_` эхэлсэн байх ёстой
- API key-г хэнтэй ч хуваалцахгүй байх
- `.env.local` файлыг `.gitignore` дотор байх ёстой (аль хэдийн байгаа)

## Алхам 4: Domain Verify хийх (Optional, гэхдээ зөвлөмж)

Production дээр ашиглахын тулд:

1. [Resend Domains](https://resend.com/domains) руу очоод
2. "Add Domain" дээр дарах
3. Domain name оруулах (жишээ: `yourdomain.com`)
4. DNS records-ийг domain provider дээр нэмэх
5. Verify хийх

**Анхаар:** Domain verify хийгээгүй бол `onboarding@resend.dev` ашиглах болно (Resend-ийн default domain).

## Алхам 5: Server restart

Environment variable өөрчлөсний дараа development server-ийг дахин эхлүүлнэ:

```bash
npm run dev
```

## Тест хийх

1. HR системд нэвтрэнэ үү
2. Dashboard хуудснаас "Ажилтан нэмэх" товчлуур дээр дарах
3. Шинэ ажилтан нэмэх
4. Тухайн ажилтны имэйл рүү нэвтрэх мэдээлэл ирсэн эсэхийг шалгах

## Алдаа засах

### "RESEND_API_KEY not configured" гэсэн алдаа гарвал:
- `.env.local` файлд `RESEND_API_KEY` байгаа эсэхийг шалгах
- Server-ийг дахин эхлүүлсэн эсэхийг шалгах
- API key зөв эсэхийг шалгах (re_ эхэлсэн байх ёстой)

### Email илгээгдэхгүй байвал:
- Resend dashboard дээр [Logs](https://resend.com/emails) хэсгээс шалгах
- Console log-уудыг шалгах (browser console эсвэл server terminal)
- Email address зөв эсэхийг шалгах

### Rate limit алдаа:
- Resend free tier дээр сард 3,000 email илгээх боломжтой
- Хэрэв хэт их илгээвэл paid plan ашиглах хэрэгтэй

## Бусад Email Service-үүд

Хэрэв Resend ашиглахыг хүсэхгүй бол дараах service-үүдийг ашиглаж болно:

- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://mailgun.com
- **Amazon SES**: https://aws.amazon.com/ses/
- **Nodemailer + SMTP**: Аливаа SMTP server ашиглах

Эдгээрийг ашиглахын тулд `/src/app/api/email/route.ts` файлыг өөрчлөх хэрэгтэй.

## Аюулгүй байдал

- ✅ API key-г `.env.local` дотор хадгална (git-д орохгүй)
- ✅ Production дээр environment variable-уудыг зөв тохируулна
- ✅ API key-г хэнтэй ч хуваалцахгүй
- ✅ Resend dashboard дээр API key-ийн activity-г хянана
