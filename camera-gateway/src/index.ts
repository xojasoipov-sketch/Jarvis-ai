// ─── Jarvis Camera Gateway — entrypoint ────────────────────────────────────
// Ishga tushirish:
//   npm run pair -- '<QR JSON>'    → pairing + ONVIF discovery + report
//
// QR JSON shakli (Jarvis Mini App /api/cameras/pairing/create javobidan):
//   {"pairingId":"...","token":"...","pairingEndpoint":"..."}

import { GATEWAY_NAME, DISCOVERY_TIMEOUT_MS } from "./config.js";
import { discoverOnvifDevices } from "./discovery.js";
import { claimPairing, reportDiscovery, type QrPayload } from "./pairing-client.js";
import { currentIdentity } from "./signed-fetch.js";
import { startGatewayServer } from "./server.js";

async function main() {
  const args = process.argv.slice(2);

  // --serve: doimiy ishlaydigan HTTP server (snapshot/status so'rovlariga javob beradi)
  if (args.includes("--serve")) {
    startGatewayServer();
    return; // process ochiq qoladi, server.listen callback'i process'ni tirik ushlab turadi
  }

  const pairIdx = args.indexOf("--pair");
  if (pairIdx === -1) {
    console.log("Foydalanish:");
    console.log("  npm run pair -- '<QR JSON>'   — kamerani pairing qilish");
    console.log("  npm start -- --serve          — doimiy HTTP server (snapshot/status)");
    process.exitCode = 1;
    return;
  }

  const qrRaw = args[pairIdx + 1];
  if (!qrRaw) {
    console.error("QR JSON berilmadi. Misol: npm run pair -- '{\"pairingId\":\"..\",\"token\":\"..\"}'");
    process.exitCode = 1;
    return;
  }

  const qr = JSON.parse(qrRaw) as QrPayload;

  const identity = currentIdentity();
  console.log(`[gateway] Device ID: ${identity.deviceId}`);

  console.log("[pairing] Jarvis serveriga ulanmoqda...");
  await claimPairing(qr, GATEWAY_NAME);
  console.log("[pairing] ✓ Pairing session claim qilindi (Ed25519 public key ro'yxatdan o'tkazildi)");

  console.log(`[discovery] ONVIF WS-Discovery boshlandi (${DISCOVERY_TIMEOUT_MS}ms)...`);
  const devices = await discoverOnvifDevices(DISCOVERY_TIMEOUT_MS);
  console.log(`[discovery] ${devices.length} ta qurilma topildi`);

  if (devices.length === 0) {
    console.log("[discovery] Hech narsa topilmadi. Tekshiring: kamera va gateway bir subnetdami? ONVIF yoqilganmi?");
  }

  await reportDiscovery(qr.pairingId, devices);
  console.log("[pairing] Tugadi. Jarvis Mini App'da kamerani tanlab, login kiriting.");
}

main().catch((e) => {
  console.error("[gateway] Xato:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
