# Jarvis Camera Gateway

Uy tarmog'ingizda ishlaydigan local bridge. Jarvis Cloud (Vercel/Railway'dagi
Next.js ilova) sizning LAN'ingizga to'g'ridan-to'g'ri kira olmaydi — shuning
uchun bu alohida dastur kerak: u sizning tarmog'ingizda ONVIF kameralarni
topadi va Jarvis'ga **outbound** (chiquvchi) so'rovlar orqali xabar beradi.

## Bu nima qiladi (ishlaydi, sinaldi mumkin)

- ONVIF WS-Discovery orqali local tarmoqdagi kameralarni topadi (standart
  multicast probe — agressiv port-scan emas)
- Jarvis Cloud'dagi pairing sessionni QR orqali claim qiladi
- Topilgan kameralar ro'yxatini Jarvis'ga yuboradi (`/report`)
- RTSP'dan bitta snapshot frame olish uchun ffmpeg wrapper (`snapshot.ts`)

## Bu nima qilmaydi hali (ochiq qoldirilgan, fake qilinmagan)

- **Live stream serving** (WebRTC/HLS) — Cloud tomon on-demand snapshot/stream
  so'rasa, gateway'ga qanday yetkazish (outbound-only tunnel: WebSocket long-poll
  yoki reverse tunnel) hali loyihalanmagan
- **Device authentication signing** (28-band) — `publicKey` hozircha tasodifiy
  hex qiymat, haqiqiy Ed25519 keypair va so'rov imzolash yo'q
- **PTZ, recording, event engine** — bular gateway ichida umuman yozilmagan

## Ishga tushirish

```bash
cd camera-gateway
cp .env.example .env   # JARVIS_SERVER_URL'ni to'ldiring
npm install
npm run build
```

Jarvis Mini App'da **"+ Add Camera → Scan QR"** bosing — u sizga JSON qaytaradi
(`{"pairingId":"...","token":"..."}`). Shu JSON'ni gateway'ga bering:

```bash
npm run pair -- '{"pairingId":"xxx","token":"yyy"}'
```

Konsolda natija ko'rinadi: nechta kamera topilgani, Jarvis'ga yuborilgani.
Keyin Mini App'da kamerani tanlab, login (username/password) kiritasiz —
shu yerda `POST /api/cameras/pairing/confirm` chaqiriladi va kamera
Jarvis'ning `cameras` jadvaliga yoziladi.

## Docker

```bash
docker build -t jarvis-camera-gateway .
docker run --network host \
  -e JARVIS_SERVER_URL=https://your-jarvis.app \
  jarvis-camera-gateway \
  node dist/index.js --pair '{"pairingId":"xxx","token":"yyy"}'
```

`--network host` ONVIF multicast discovery uchun kerak (Docker bridge
tarmog'i multicast'ni odatda bloklaydi).

## Talab qilinadigan tashqi dastur

- **ffmpeg** (snapshot uchun) — Docker image'ga allaqachon o'rnatilgan,
  local ishga tushirishda `apt install ffmpeg` / `brew install ffmpeg` kerak

## Nima uchun bu real test qilinmagan

Bu gateway sizning uy tarmog'ingizga, real ONVIF kamerangizga ulanadi.
Men (Claude) bu muhitga kira olmayman — shuning uchun `npm run pair` ni
birinchi marta ishga tushirib, natijani tekshirish sizning qo'lingizda.
Muammo chiqsa (kamera topilmadi, ffmpeg xato beradi va h.k.) — xato xabarini
menga yuboring, birga tuzataman.
