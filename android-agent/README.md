# Jarvis Agent — Android APK

Pari AI uchun Android qurilma agenti. Termux agenti kabi ishlaydi, lekin to'liq native Android tajribasi bilan.

## Arxitektura

```
android-agent/
├── app/src/main/kotlin/uz/jarvis/agent/
│   ├── data/
│   │   ├── api/          — Retrofit API interfeysi
│   │   ├── model/        — API request/response modellari
│   │   ├── repository/   — Ma'lumot yig'ish qatlami
│   │   └── storage/      — DataStore (xavfsiz token saqlash)
│   ├── domain/model/     — Biznes mantiq modellari
│   ├── service/          — Foreground Service (fon agenti)
│   ├── receiver/         — Boot receiver (avtomatik ishga tushish)
│   ├── util/
│   │   ├── CommandExecutor.kt  — Buyruqlar bajaruvchi
│   │   └── DeviceInfo.kt       — Qurilma ma'lumotlari
│   ├── ui/
│   │   ├── screen/       — Jetpack Compose ekranlar
│   │   ├── viewmodel/    — MVVM
│   │   ├── navigation/   — Nav Host
│   │   └── theme/        — Rang va uslub
│   └── di/               — Hilt DI modullari
```

## Ekranlar

| Ekran | Maqsad |
|-------|--------|
| **Home** | Holat va agent boshqaruvi |
| **QR Scanner** | `jarvis://pair?...` deep link skanerlash |
| **Permissions** | Ruxsatlarni so'rash |
| **Settings** | Ulash ma'lumotlari va qurilmani uzish |

## API ulanishlar

| Endpoint | Vazifa |
|----------|--------|
| `POST /api/devices/pair/confirm` | Pairing tokenini tasdiqlash → device_token olish |
| `POST /api/devices/heartbeat` | Har 30s da "online" holat |
| `GET /api/devices/poll?device_id=...` | Buyruqlarni olish |
| `POST /api/devices/result` | Natijani yuborish |
| `POST /api/devices/revoke` | Tokenni o'chirish |

## Buyruqlar (whitelist)

- `device_status` — qurilma ma'lumotlari
- `battery_status` — batareya holati
- `storage_status` — disk holati
- `get_location` — GPS joylashuv
- `send_notification` — bildirishnoma yuborish
- `vibrate` — tebratish
- `get_files` — fayl ro'yxati
- `download_file` — URL dan fayl yuklash
- `terminal_command` — shell buyruq (xavfli buyruqlar bloklangan)
- `voice_record` — ovoz yozish
- `clipboard_sync` — clipboard sinxronlash

## Build

```bash
cd android-agent
./gradlew assembleDebug          # Debug APK
./gradlew assembleRelease        # Release APK (signing kerak)
./gradlew bundleRelease          # Play Store AAB
```

APK joylashuvi: `app/build/outputs/apk/debug/app-debug.apk`

## Imzolash (Release)

```bash
# Kalit yaratish
keytool -genkey -v -keystore jarvis-key.jks -alias jarvis -keyalg RSA -keysize 2048 -validity 10000

# app/build.gradle.kts ga qo'shing:
signingConfigs {
    create("release") {
        storeFile = file("jarvis-key.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = "jarvis"
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```

## Deep Link

Pari AI dashboard → Qurilmalar → QR Pairing → QR kod generatsiya qilinadi.
QR kodni Jarvis Agent ilovasi orqali skanerlang.

Format: `jarvis://pair?device_id={uuid}&token={hmac_token}&server={server_url}`
