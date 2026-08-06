#!/usr/bin/env python3
"""
Pari AI — Termux Device Agent
==============================
QR pairing orqali ulangan qurilmada ishlaydigan doimiy agent.
Termux-API paketi o'rnatilgan bo'lishi kerak: `pkg install termux-api`

Ishlatilishi (setup/phone sahifasi avtomatik generatsiya qiladi):
    python pari_device_agent.py --server https://... --device-id <id> --token <pairing_token>

Birinchi ishga tushirishda pairing tokenidan foydalanib serverdan doimiy
device_token oladi va uni ~/.pari_device.json ga saqlaydi. Keyingi
ishga tushirishlarda saqlangan device_token bilan davom etadi.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import platform
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests kutubxonasi yo'q. O'rnating: pip install requests", file=sys.stderr)
    sys.exit(1)

CONFIG_PATH = Path.home() / ".pari_device.json"
HEARTBEAT_INTERVAL = 15  # soniya
POLL_INTERVAL = 5        # soniya

# Spetsifikatsiyada ruxsat etilgan buyruqlar — boshqa hech narsa bajarilmaydi
ALLOWED_ACTIONS = {
    "device_status", "battery_status", "get_location", "take_screenshot",
    "send_notification", "vibrate", "open_camera", "get_files",
    "upload_file", "download_file", "terminal_command",
}


def sh(cmd: list[str], timeout: int = 15) -> str:
    """termux-api buyruqlarini xavfsiz bajarish (faqat ro'yxatdagi komandalar)."""
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return out.stdout.strip() or out.stderr.strip()
    except FileNotFoundError:
        return f"xato: {cmd[0]} topilmadi (termux-api o'rnatilganmi?)"
    except subprocess.TimeoutExpired:
        return "xato: vaqt tugadi"


class PariAgent:
    def __init__(self, server: str, device_id: str, pairing_token: str | None):
        self.server = server.rstrip("/")
        self.device_id = device_id
        self.device_token = None
        self._load_or_pair(pairing_token)

    # ── Pairing ──────────────────────────────────────────────────────────
    def _load_or_pair(self, pairing_token: str | None):
        if CONFIG_PATH.exists():
            data = json.loads(CONFIG_PATH.read_text())
            if data.get("device_id") == self.device_id and data.get("device_token"):
                self.device_token = data["device_token"]
                print("✅ Saqlangan device_token topildi, pairing shart emas")
                return

        if not pairing_token:
            print("❌ device_token topilmadi va pairing_token berilmagan. --token bilan qayta urinib ko'ring.")
            sys.exit(1)

        print("🔗 Serverga ulanmoqda (pairing tasdiqlash)...")
        resp = requests.post(
            f"{self.server}/api/devices/pair/confirm",
            json={
                "device_id": self.device_id,
                "token": pairing_token,
                "name": f"Termux ({platform.node() or 'Android'})",
                "platform": "android",
                "os_info": platform.platform(),
            },
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"❌ Pairing muvaffaqiyatsiz: {resp.status_code} {resp.text}")
            sys.exit(1)

        data = resp.json()
        self.device_token = data["device_token"]
        CONFIG_PATH.write_text(json.dumps({"device_id": self.device_id, "device_token": self.device_token}))
        os.chmod(CONFIG_PATH, 0o600)
        print(f"✅ Ulandi! Device ID: {self.device_id}")

    def _auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.device_token}", "Content-Type": "application/json"}

    # ── Heartbeat ────────────────────────────────────────────────────────
    def heartbeat(self):
        battery_raw = sh(["termux-battery-status"])
        battery = None
        try:
            battery = json.loads(battery_raw).get("percentage")
        except Exception:
            pass

        try:
            requests.post(
                f"{self.server}/api/devices/heartbeat",
                headers=self._auth_headers(),
                json={"device_id": self.device_id, "battery": battery},
                timeout=10,
            )
        except requests.RequestException as e:
            print(f"⚠️  Heartbeat xato: {e}")

    # ── Poll & execute ───────────────────────────────────────────────────
    def poll_and_run(self):
        try:
            resp = requests.get(
                f"{self.server}/api/devices/poll",
                headers=self._auth_headers(),
                params={"device_id": self.device_id},
                timeout=10,
            )
        except requests.RequestException as e:
            print(f"⚠️  Poll xato: {e}")
            return

        if resp.status_code == 401:
            print("🔒 Sessiya bekor qilingan (revoked). Agent to'xtatilmoqda.")
            sys.exit(1)
        if resp.status_code != 200:
            return

        for cmd in resp.json().get("commands", []):
            self._execute(cmd)

    def _execute(self, cmd: dict):
        action = cmd.get("action")
        payload = cmd.get("payload") or {}
        cmd_id = cmd["id"]

        if action not in ALLOWED_ACTIONS:
            self._submit(cmd_id, {"error": "ruxsat etilmagan buyruq"}, "error")
            return

        print(f"▶ {action}")
        try:
            result = self._run_action(action, payload)
            self._submit(cmd_id, result, "done")
        except Exception as e:
            self._submit(cmd_id, {"error": str(e)}, "error")

    def _run_action(self, action: str, payload: dict):
        if action == "device_status":
            return {"platform": "android", "os": platform.platform(), "python": platform.python_version()}
        if action == "battery_status":
            return json.loads(sh(["termux-battery-status"]) or "{}")
        if action == "get_location":
            return json.loads(sh(["termux-location", "-p", "gps", "-r", "once"]) or "{}")
        if action == "take_screenshot":
            # Termux'da root'siz screenshot cheklangan — best-effort
            return {"note": "screenshot Termux'da root talab qiladi, qo'llab-quvvatlanmaydi"}
        if action == "send_notification":
            sh(["termux-notification", "--title", payload.get("title", "Pari"), "--content", payload.get("message", "")])
            return {"ok": True}
        if action == "vibrate":
            sh(["termux-vibrate", "-d", str(int(payload.get("duration", 500)))])
            return {"ok": True}
        if action == "open_camera":
            path = f"/data/data/com.termux/files/home/pari_photo_{int(time.time())}.jpg"
            sh(["termux-camera-photo", "-c", "0", path], timeout=20)
            return {"path": path}
        if action == "get_files":
            path = payload.get("path", str(Path.home()))
            try:
                return {"files": os.listdir(path)}
            except Exception as e:
                return {"error": str(e)}
        if action == "download_file":
            url, dest = payload.get("url"), payload.get("path", "/data/data/com.termux/files/home/downloaded")
            r = requests.get(url, timeout=30)
            Path(dest).write_bytes(r.content)
            return {"saved_to": dest, "bytes": len(r.content)}
        if action == "upload_file":
            # Fayl serverga base64 orqali natija sifatida qaytariladi (kichik fayllar uchun)
            path = payload.get("path")
            import base64
            data = Path(path).read_bytes()
            return {"filename": os.path.basename(path), "b64": base64.b64encode(data).decode()}
        if action == "terminal_command":
            # DIQQAT: bu xavfli buyruq — faqat ishonchli, autentifikatsiyalangan
            # device_token egasi (ya'ni siz) buyruq yubora oladi.
            return {"output": sh(["sh", "-c", payload.get("command", "")], timeout=30)}
        return {"error": "amalga oshirilmagan"}

    def _submit(self, cmd_id: str, result, status: str):
        try:
            requests.post(
                f"{self.server}/api/devices/result",
                headers=self._auth_headers(),
                json={"device_id": self.device_id, "cmd_id": cmd_id, "result": result, "status": status},
                timeout=10,
            )
        except requests.RequestException as e:
            print(f"⚠️  Natija yuborishda xato: {e}")

    # ── Main loop ────────────────────────────────────────────────────────
    def run(self):
        print(f"🟢 Pari Agent ishga tushdi — {self.server}")
        last_heartbeat = 0.0
        while True:
            now = time.time()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                self.heartbeat()
                last_heartbeat = now
            self.poll_and_run()
            time.sleep(POLL_INTERVAL)


def main():
    p = argparse.ArgumentParser(description="Pari AI Termux Device Agent")
    p.add_argument("--server", required=True, help="Jarvis server URL")
    p.add_argument("--device-id", required=True, help="QR orqali berilgan device_id")
    p.add_argument("--token", help="Pairing token (faqat birinchi ishga tushirishda kerak)")
    args = p.parse_args()

    agent = PariAgent(args.server, args.device_id, args.token)
    try:
        agent.run()
    except KeyboardInterrupt:
        print("\n👋 To'xtatildi")


if __name__ == "__main__":
    main()
