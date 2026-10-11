# Healthy Ice Cream & Keto Bar Landing Page

Landing page عربية لمنتجات Healthy & Tasty (آيس كريم + كيتو بار) مبنية بـ React وVite. الصفحة تعرض العروض، تجمع بيانات الطلب، تبعت الطلب إلى Google Sheets عن طريق Google Apps Script، وتدعم Meta Pixel + Conversions API لتتبع حدث الشراء من المتصفح والسيرفر.

## Features

- صفحة RTL عربية موجهة للموبايل والديسكتوب.
- عروض متعددة مع سلة بسيطة واختيار كمية كل عرض.
- اختيار توزيع النكهات لكل طلب.
- فورم بيانات العميل مع validation.
- إرسال الطلب إلى Google Sheets عبر Google Apps Script.
- Meta Pixel browser event باسم `Purchase`.
- Meta Conversions API server event عبر Google Apps Script بنفس `event_id` لمطابقة Browser and Server.

## Tech Stack

- React
- Vite
- Lucide React icons
- Google Apps Script
- Meta Pixel / Meta Graph API

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

ملفات الرفع النهائية بتكون داخل:

```txt
dist/
```

المشروع Frontend فقط، لذلك رفع `dist` على استضافة static سيشغل الصفحة والـ Pixel. أما CAPI فتعمل من خلال Google Apps Script المنشور، وليس من الاستضافة نفسها.

## Order Flow

1. العميل يختار الأوفر والكمية والنكهات.
2. عند تأكيد الطلب، المتصفح يرسل Meta Pixel event:

```js
fbq('track', 'Purchase', eventParams, { eventID: eventId })
```

3. نفس الطلب يتبعت إلى Google Apps Script.
4. Google Apps Script يسجل الطلب في Google Sheets.
5. Google Apps Script يرسل Server Event إلى Meta Conversions API بنفس:

```txt
event_name
event_time
action_source
event_id
```

بهذا يظهر الحدث في Meta Test Events كـ `Received From: Browser and Server` عند ضبط السكريبت والتوكن بشكل صحيح.

## Google Apps Script Setup

انسخ محتوى الملف:

```txt
google-apps-script.js
```

إلى Google Apps Script المرتبط بالشيت، ثم عدل القيم التالية:

```js
var FB_PIXEL_ID = '1444230060383429';
var FB_ACCESS_TOKEN = 'PASTE_META_CAPI_ACCESS_TOKEN_HERE';
var FB_TEST_EVENT_CODE = '';
```

أثناء الاختبار، ضع Test Event Code من Meta في:

```js
var FB_TEST_EVENT_CODE = 'TEST_CODE_FROM_META';
```

بعد التعديل اعمل Deploy كـ Web App:

- Execute as: Me
- Who has access: Anyone

ثم استخدم رابط الـ Web App داخل `ORDER_API_URL` في:

```txt
src/App.jsx
```

## Sheet Columns

السكريبت يكتب الأعمدة التالية:

- Date and time
- Name
- Phone
- Governorate
- Address
- Notes
- Bundle
- Flavors
- Quantity
- Price (الإجمالي فقط — مفيش أعمدة شحن/وزن/منتجات/قيمة في الشيت)

عمود `Bundle` يستقبل اسم الأوفر والكمية فقط، مثل:

```txt
عرض الآيس كريم ×1
```

عمود `Flavors` يستقبل تفاصيل النكهات، مثل:

```txt
عرض الآيس كريم ×1 (2 فانيليا + 2 شوكولاتة + 1 فراولة)
```

## Verification

```bash
npx eslint src\App.jsx
npm run build
```

ملاحظة: `npm run lint` الكامل قد يظهر أخطاء على ملف Google Apps Script لأن ESLint المحلي لا يعرف globals الخاصة بجوجل مثل `SpreadsheetApp` و`UrlFetchApp`.

## Deployment Notes

- لو الاستضافة static فقط، ارفع محتويات `dist`.
- تأكد أن Google Apps Script منشور ومتاح لأي شخص.
- لا تضع Meta access token داخل كود React أو أي ملف يتم رفعه للمتصفح.
- بعد أي تعديل على Google Apps Script، اعمل Deploy new version.

## Offers dashboard integration

- Offers are read from the shared Supabase `offers` table with `site = ice-cream` and `is_active = true`, ordered by `sort_order`.
- Local development uses ignored `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The engineer must add the same public configuration to the hosting build environment before the final deployment. Rebuild after environment changes.
- Existing slugs are `icecream`, `ketobar`, and `halawa`; local offer and flavor images are retained unless dashboard images are supplied. New offers without an image use the brand logo.
- Prices, units, flavors and visibility refresh on page reload. Reloading checkout waits for the offer request and restores only available offers. Flavor drafts reset when units or flavor names/order change.
- Cached raw rows or local offers are used if the request fails. A successful empty response shows no offers.
- Shipping amounts are not charged by this page; the call center handles shipping. Hero text, FAQ text and promotional badges/descriptions require editorial updates when prices or offers change.
- Order sending and Meta tracking retain their existing behavior. The confirmation screen appears before the background send finishes; verify real receipt in the order sheet after deployment. Automated local checks intercept all orders and tracking.

### Managed flavors
Names, images, order and visibility are managed per offer in the dashboard. `src/flavorCatalog.js` defines the shared JSON contract and legacy defaults. Hidden flavors are excluded from selection and order summaries; a required product group with no visible flavors makes its offer unavailable. Changes take effect on reload; offline fallback uses the last cached catalog. Hero/FAQ/description copy remains manually maintained. No SQL migration is required.
