#!/usr/bin/env python3
"""
pari-bridge.py — Pari AI lokal ko'prik agenti
=====================================================
Bu skript kompyuteringizda ishlab, Pari AI buyruqlarini
bajaradi: screenshot, klik, klavyatura, dastur ochish va boshqalar.

O'rnatish:
  pip install pyautogui pillow requests psutil

Ishga tushirish:
  python pari-bridge.py --url https://your-app.railway.app --name "Mening kompyuterim"

Yoki .env faylida:
  PARI_URL=https://...
  PARI_DEVICE_ID=my-pc-001
  PARI_DEVICE_NAME=Mening kompyuterim
"""

import os
import sys
import uuid
import time
import base64
import platform
import getpass
import argparse
import threading
import subprocess
import json
import io
from datetime import datetime

try:
    import requests
except ImportError:
    print("❌  requests o'rnatilmagan: pip install requests")
    sys.exit(1)

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_GUI = True
except ImportError:
    HAS_GUI = False
    print("⚠️  pyautogui yo'q — GUI buyruqlari ishlamaydi. pip install pyautogui pillow")

try:
    from PIL import ImageGrab, Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ── Config ───────────────────────────────────────────────────────────────────

def load_config():
    parser = argparse.ArgumentParser(description="Pari AI local bridge")
    parser.add_argument("--url",    default=os.getenv("PARI_URL", ""), help="Pari AI URL")
    parser.add_argument("--id",     default=os.getenv("PARI_DEVICE_ID", ""), help="Device ID")
    parser.add_argument("--name",   default=os.getenv("PARI_DEVICE_NAME", ""), help="Device name")
    parser.add_argument("--secret", default=os.getenv("PARI_SECRET", ""), help="Optional shared secret")
    parser.add_argument("--interval", type=float, default=2.0, help="Poll interval seconds")
    parser.add_argument("--screenshot-interval", type=float, default=10.0, help="Auto screenshot interval")
    args = parser.parse_args()

    if not args.url:
        args.url = input("Pari AI URL kiriting (masalan https://pari.railway.app): ").strip()

    if not args.id:
        # Stable device ID stored locally
        id_file = os.path.expanduser("~/.pari-device-id")
        if os.path.exists(id_file):
            args.id = open(id_file).read().strip()
        else:
            args.id = str(uuid.uuid4())
            open(id_file, "w").write(args.id)

    if not args.name:
        args.name = f"{getpass.getuser()}@{platform.node()}"

    args.url = args.url.rstrip("/")
    return args

# ── Screenshot ───────────────────────────────────────────────────────────────

def take_screenshot(quality=50, max_width=1280):
    """Returns base64-encoded JPEG screenshot or None."""
    try:
        if HAS_PIL:
            img = ImageGrab.grab()
        elif HAS_GUI:
            img = pyautogui.screenshot()
        else:
            return None, None

        w, h = img.size
        resolution = f"{w}x{h}"

        # Resize if too large
        if w > max_width:
            ratio = max_width / w
            img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)

        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return b64, resolution
    except Exception as e:
        print(f"  ⚠️  Screenshot xatosi: {e}")
        return None, None

# ── Command executor ──────────────────────────────────────────────────────────

def execute_command(action: str, payload: dict) -> dict:
    """Execute a single command. Returns {result, error, screenshot_b64}."""
    result = {}
    error = None
    include_screenshot = False

    try:
        # ── Screenshot ──────────────────────────────────────────────────────
        if action == "screenshot":
            b64, res = take_screenshot(quality=payload.get("quality", 60))
            if b64:
                result = {"ok": True, "resolution": res}
                include_screenshot = True
            else:
                error = "Screenshot olinmadi (pyautogui yoki PIL kerak)"

        # ── Shell command ───────────────────────────────────────────────────
        elif action == "shell" or action == "run":
            cmd = payload.get("command") or payload.get("cmd", "")
            if not cmd:
                error = "command bo'sh"
            else:
                proc = subprocess.run(
                    cmd, shell=True, capture_output=True, text=True, timeout=30
                )
                result = {
                    "stdout": proc.stdout[-4000:] if proc.stdout else "",
                    "stderr": proc.stderr[-2000:] if proc.stderr else "",
                    "returncode": proc.returncode,
                }

        # ── Open app / URL ──────────────────────────────────────────────────
        elif action == "open_app" or action == "open":
            target = payload.get("app") or payload.get("url") or payload.get("path", "")
            if not target:
                error = "app/url bo'sh"
            else:
                if sys.platform == "win32":
                    os.startfile(target)
                elif sys.platform == "darwin":
                    subprocess.Popen(["open", target])
                else:
                    subprocess.Popen(["xdg-open", target])
                result = {"ok": True, "opened": target}

        # ── Type text ───────────────────────────────────────────────────────
        elif action == "type":
            if not HAS_GUI:
                error = "pyautogui o'rnatilmagan"
            else:
                text = str(payload.get("text", ""))
                delay = float(payload.get("interval", 0.03))
                time.sleep(payload.get("delay_before", 0.3))
                pyautogui.typewrite(text, interval=delay)
                result = {"ok": True, "typed": len(text)}
                include_screenshot = True

        # ── Hotkey ──────────────────────────────────────────────────────────
        elif action == "hotkey" or action == "keys":
            if not HAS_GUI:
                error = "pyautogui o'rnatilmagan"
            else:
                keys = payload.get("keys", [])
                if isinstance(keys, str):
                    keys = [keys]
                pyautogui.hotkey(*keys)
                result = {"ok": True, "keys": keys}

        # ── Mouse click ─────────────────────────────────────────────────────
        elif action == "click":
            if not HAS_GUI:
                error = "pyautogui o'rnatilmagan"
            else:
                x = payload.get("x")
                y = payload.get("y")
                btn = payload.get("button", "left")
                clicks = payload.get("clicks", 1)
                if x is not None and y is not None:
                    pyautogui.click(int(x), int(y), button=btn, clicks=clicks)
                else:
                    pyautogui.click(button=btn, clicks=clicks)
                result = {"ok": True}
                include_screenshot = True

        # ── Move mouse ──────────────────────────────────────────────────────
        elif action == "move":
            if not HAS_GUI:
                error = "pyautogui o'rnatilmagan"
            else:
                x = int(payload.get("x", 0))
                y = int(payload.get("y", 0))
                duration = float(payload.get("duration", 0.2))
                pyautogui.moveTo(x, y, duration=duration)
                result = {"ok": True, "position": [x, y]}

        # ── Scroll ──────────────────────────────────────────────────────────
        elif action == "scroll":
            if not HAS_GUI:
                error = "pyautogui o'rnatilmagan"
            else:
                clicks = int(payload.get("clicks", 3))
                pyautogui.scroll(clicks)
                result = {"ok": True}

        # ── Volume (Windows) ────────────────────────────────────────────────
        elif action == "volume":
            level = int(payload.get("level", 50))
            if sys.platform == "win32":
                # Uses nircmd if available, else PowerShell
                ps = f"$obj = New-Object -com WScript.Shell; $obj.SendKeys([char]174); " \
                     f"Add-Type -AssemblyName System.Windows.Forms; " \
                     f"[System.Windows.Forms.SendKeys]::SendWait('')"
                # Simpler: set exact volume via PS
                subprocess.run(
                    ["powershell", "-c",
                     f"$vol = {level}/100.0; $code = '[DllImport(\"user32.dll\")] public static extern void keybd_event(byte bVk,byte bScan,uint dwFlags,int dwExtraInfo);'; "
                     f"Add-Type -MemberDefinition $code -Name 'WinAPI' -Namespace 'Win32'; "
                     f"$muteSym = 0xAD; $volDown = 0xAE; $volUp = 0xAF;"],
                    capture_output=True
                )
                result = {"ok": True, "level": level, "note": "PowerShell volume command sent"}
            elif sys.platform == "darwin":
                subprocess.run(["osascript", "-e", f"set volume output volume {level}"], capture_output=True)
                result = {"ok": True, "level": level}
            else:
                subprocess.run(["amixer", "-q", "sset", "Master", f"{level}%"], capture_output=True)
                result = {"ok": True, "level": level}

        # ── Lock screen ─────────────────────────────────────────────────────
        elif action == "lock":
            if sys.platform == "win32":
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"])
            elif sys.platform == "darwin":
                subprocess.run(["pmset", "displaysleepnow"])
            else:
                subprocess.run(["loginctl", "lock-session"])
            result = {"ok": True}

        # ── Clipboard get ───────────────────────────────────────────────────
        elif action == "clipboard_get":
            if HAS_GUI:
                content = pyautogui.pyperclip.paste()
                result = {"content": content[:2000]}
            else:
                error = "pyautogui o'rnatilmagan"

        # ── Clipboard set ───────────────────────────────────────────────────
        elif action == "clipboard_set":
            if HAS_GUI:
                text = str(payload.get("text", ""))
                pyautogui.pyperclip.copy(text)
                result = {"ok": True}
            else:
                error = "pyautogui o'rnatilmagan"

        # ── System info ─────────────────────────────────────────────────────
        elif action == "sysinfo":
            try:
                import psutil
                info = {
                    "cpu_percent": psutil.cpu_percent(interval=0.5),
                    "ram_used_gb": round(psutil.virtual_memory().used / 1e9, 2),
                    "ram_total_gb": round(psutil.virtual_memory().total / 1e9, 2),
                    "disk_free_gb": round(psutil.disk_usage("/").free / 1e9, 2),
                    "battery": None,
                }
                try:
                    bat = psutil.sensors_battery()
                    info["battery"] = {"percent": bat.percent, "plugged": bat.power_plugged} if bat else None
                except Exception:
                    pass
                result = info
            except ImportError:
                result = {
                    "os": platform.system(),
                    "node": platform.node(),
                    "note": "psutil o'rnatilmagan, to'liq ma'lumot uchun: pip install psutil"
                }

        # ── Notify (desktop notification) ───────────────────────────────────
        elif action == "notify":
            title = str(payload.get("title", "Pari AI"))
            message = str(payload.get("message", ""))
            if sys.platform == "win32":
                subprocess.run(
                    ["powershell", "-c",
                     f'[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");'
                     f'$notify = New-Object System.Windows.Forms.NotifyIcon;'
                     f'$notify.Icon = [System.Drawing.SystemIcons]::Information;'
                     f'$notify.Visible = $True;'
                     f'$notify.ShowBalloonTip(5000, "{title}", "{message}", [System.Windows.Forms.ToolTipIcon]::None)'],
                    capture_output=True
                )
            elif sys.platform == "darwin":
                subprocess.run(
                    ["osascript", "-e", f'display notification "{message}" with title "{title}"'],
                    capture_output=True
                )
            else:
                subprocess.run(["notify-send", title, message], capture_output=True)
            result = {"ok": True}

        else:
            error = f"Noma'lum buyruq: {action}"

    except subprocess.TimeoutExpired:
        error = "Buyruq vaqti tugadi (30s)"
    except Exception as e:
        error = f"{type(e).__name__}: {e}"

    output = {"result": result}
    if error:
        output["error"] = error

    if include_screenshot and HAS_GUI:
        b64, res = take_screenshot(quality=55)
        if b64:
            output["screenshot_b64"] = b64
            output["resolution"] = res

    return output

# ── Main loop ─────────────────────────────────────────────────────────────────

class PariBridge:
    def __init__(self, cfg):
        self.cfg = cfg
        self.base = f"{cfg.url}/api/computer"
        self.device_id = cfg.id
        self.running = True
        self.last_screenshot_time = 0

    def headers(self):
        h = {"Content-Type": "application/json"}
        if self.cfg.secret:
            h["X-Pari-Secret"] = self.cfg.secret
        return h

    def heartbeat(self, with_screenshot=False):
        b64, res = (None, None)
        if with_screenshot:
            b64, res = take_screenshot(quality=45)

        data = {
            "device_id": self.device_id,
            "name": self.cfg.name,
            "os": f"{platform.system()} {platform.release()}",
            "username": getpass.getuser(),
        }
        if res:
            data["resolution"] = res
        if b64:
            data["screenshot_b64"] = b64

        try:
            requests.post(
                f"{self.base}?action=heartbeat",
                json=data, headers=self.headers(), timeout=8
            )
        except Exception:
            pass

    def poll(self):
        try:
            r = requests.get(
                f"{self.base}?device_id={self.device_id}",
                headers=self.headers(), timeout=10
            )
            if r.status_code != 200:
                return
            data = r.json()
            commands = data.get("commands", [])
            for cmd in commands:
                threading.Thread(
                    target=self.run_command, args=(cmd,), daemon=True
                ).start()
        except Exception as e:
            print(f"  ⚠️  Poll xatosi: {e}")

    def run_command(self, cmd: dict):
        cmd_id = cmd.get("id")
        action = cmd.get("action", "")
        payload = cmd.get("payload", {})
        print(f"  ▶  {action} {json.dumps(payload)[:80]}")

        output = execute_command(action, payload)

        err = output.get("error")
        res = output.get("result")
        print(f"  {'✅' if not err else '❌'}  {err or json.dumps(res)[:120]}")

        post_data = {
            "command_id": cmd_id,
            "device_id": self.device_id,
            "result": res,
        }
        if err:
            post_data["error"] = err
        if "screenshot_b64" in output:
            post_data["screenshot_b64"] = output["screenshot_b64"]
            post_data["resolution"] = output.get("resolution")

        try:
            requests.post(
                f"{self.base}?action=result",
                json=post_data, headers=self.headers(), timeout=15
            )
        except Exception as e:
            print(f"  ⚠️  Result yuborishda xato: {e}")

    def run(self):
        print(f"\n{'='*55}")
        print(f"  Pari AI Bridge — {self.cfg.name}")
        print(f"  ID:   {self.device_id}")
        print(f"  URL:  {self.cfg.url}")
        print(f"  OS:   {platform.system()} {platform.release()}")
        print(f"  GUI:  {'ha (pyautogui)' if HAS_GUI else 'yoq'}")
        print(f"{'='*55}\n")
        print("  Pari AI bilan bog'lanmoqda...")

        # First heartbeat with screenshot
        self.heartbeat(with_screenshot=True)
        self.last_screenshot_time = time.time()
        print("  ✅  Ulandi! Buyruqlar kutilmoqda...\n")

        while self.running:
            try:
                self.poll()

                # Periodic screenshot heartbeat
                now = time.time()
                if now - self.last_screenshot_time >= self.cfg.screenshot_interval:
                    self.heartbeat(with_screenshot=True)
                    self.last_screenshot_time = now
                else:
                    self.heartbeat(with_screenshot=False)

                time.sleep(self.cfg.interval)
            except KeyboardInterrupt:
                print("\n  🛑  To'xtatildi.")
                self.running = False
            except Exception as e:
                print(f"  ⚠️  {e}")
                time.sleep(5)


if __name__ == "__main__":
    cfg = load_config()
    bridge = PariBridge(cfg)
    bridge.run()
