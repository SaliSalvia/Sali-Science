[![CI](https://github.com/SaliSalvia/Sali-Science/actions/workflows/ci.yml/badge.svg)](https://github.com/SaliSalvia/Sali-Science/actions/workflows/ci.yml)

# Sali-Science — Axiom Jury 🔬

**کلاینت داوری و تحلیل علمی برای پژوهشگران و مخترعان، قدرت‌گرفته از Google Gemini.**

پروژه‌های پژوهشی خود را (ZIP، کد C/C++/Python، مقاله، DOCX، PDF، تصویر) بارگذاری کنید؛ Axiom Jury مانند یک هیئت داوران بین‌المللی و کارشناس پتنت (WIPO/USPTO) پروژه را با نگاه سخت‌گیرانه و ریزبین ارزیابی می‌کند، نقایص را تفکیک می‌کند (آنچه هوش مصنوعی می‌تواند رفع کند در برابر آنچه نیازمند آزمایش فیزیکی/آزمایشگاهی است) و اصلاحات پیشنهادی را فقط با **مجوز صریح شما** و نمایش **دیف خط‌به‌خط** اعمال می‌کند.

## ✨ امکانات کلیدی

- 📦 آنزیپ سمت کلاینت چندین ZIP و نمایش درختی پوشه‌ها با تگ نسخه (v1، v2 و…)
- ⚖️ داوری چندبعدی: اعتبارسنجی فیزیک/ریاضیات، قابلیت ثبت پتنت، استحکام کد و مهندسی
- 🧬 تحلیل و سنتز چندنسخه‌ای: رتبه‌بندی نسخه‌ها + «فرمول ترکیب بهینه» (Hybrid Master Synthesis)
- ✏️ ویرایش انواع فایل (کد، Markdown، DOCX و…) با تأیید مرحله‌ای و دیف کامل
- 🏷️ تغییر نام آرشیوها/پروژه‌ها با دوبار کلیک، راست‌کلیک یا لمس طولانی (به‌همراه به‌روزرسانی خودکار تگ نسخه همه فایل‌های آن آرشیو)
- 🧾 خروجی JSON داوری به‌صورت **تضمینی** با Structured Output (responseSchema گمنای) — بدون وابستگی به پارس متنی
- 🖼️ ارسال PDF و تصاویر به‌صورت چندرسانه‌ای (inlineData) به Gemini
- 📱 چیدمان واکنش‌گرا با ناوبری موبایل (اندروید/iOS) و رابط RTL فارسی

## 🧱 پشته فناوری

React 19 · TypeScript · Vite · Tailwind CSS 4 · @google/genai · JSZip · diff · lucide-react · Express (پراکسی اختیاری)

## 🚀 اجرا

```bash
bun install        # یا npm install
bun run dev        # سرور توسعه روی http://localhost:3000
```

کلید Gemini API را در اولین اجرا از طریق مودال تنظیمات وارد کنید (سهمیه رایگان: Google AI Studio).

## ✅ تست‌ها

```bash
npm test           # اجرای logic.test.ts (پارس JSON داوری، اعمال اصلاحات، دیف و درخت فایل)
npm run lint       # بررسی تایپ‌ها با tsc
```

CI در GitHub Actions روی هر push/PR اجرا می‌شود: نصب وابستگی‌ها، بررسی تایپ، تست‌ها و build.

## 🔐 امنیت: حالت خودمیزبان (Self-hosted)

در حالت عادی کلید API در مرورگر (localStorage) نگه‌داری می‌شود که فقط برای استفاده شخصی مناسب است. برای استقرار عمومی، از پراکسی سمت سرور استفاده کنید تا کلید هرگز به مرورگر نرسد:

```bash
cp .env.example .env                   # GEMINI_API_KEY را قرار دهید
VITE_API_MODE=proxy npm run build      # بیلد کلاینت در حالت پراکسی
npm run serve                          # Express روی :3000 + /api/gemini و /api/gemini/stream (SSE)
```

در حالت پراکسی، چت‌های عادی به‌صورت استریم (SSE) پاس می‌شوند و داوری‌های ساختاریافته با خروجی JSON تضمینی از اندپوینت غیراستریمی دریافت می‌شوند.

## 📂 ساختار پروژه

```
src/lib/fileSystem.ts    # آنزیپ ZIP، استخراج DOCX، درخت فایل O(n)، خروجی ZIP
src/lib/juryEngine.ts    # پرامپت داوری، JURY_RESPONSE_SCHEMA، پارس JSON، اعمال اصلاحات، دیف
src/lib/geminiClient.ts  # ارتباط با Gemini (استریم، حالت پراکسی SSE، structured output)
src/lib/types.ts         # مدل‌های داده (VirtualFile، JuryEvaluation و…)
src/components/          # رابط کاربری (FileExplorer با تغییر نام آرشیو و…)
server/proxy.js          # پراکسی کلید API + استریم SSE
.github/workflows/       # CI (تایپ‌چک، تست، build)
```

## 🗺️ نقشه راه

- [x] استریم پاسخ‌ها از طریق پراکسی سرور (SSE)
- [x] تغییر نام آرشیو/پروژه و مدیریت نسخه‌ها در رابط کاربری
- [x] استفاده از responseSchema گمنای برای خروجی JSON تضمینی
- [x] CI با GitHub Actions (type-check + test + build)
- [ ] تاریخچه ارزیابی‌ها و خروجی PDF کارنامه داوری
- [ ] حذف مدل‌های قدیمی 1.5 و افزودن مدل‌های جدیدتر

## 📄 مجوز

Apache-2.0 — همان‌طور که در هدر فایل‌های سورس (SPDX) مشخص شده.
