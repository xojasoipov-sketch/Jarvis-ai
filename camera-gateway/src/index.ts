// ─── Jarvis Camera Gateway — entrypoint ────────────────────────────────────
// Ishga tushirish:
//   npm run pair -- '<QR JSON>'    → pairing + ONVIF discovery + report
//
// QR JSON shakli (Jarvis Mini App /api/cameras/pairing/create javobidan):
//   {"pairingId":"...","token":"...","pairingEndpoint":"..."}

import { loadOrCreateState, GATEWAY_NAME, DISCOVERY_TIMEOUT_MS } from "./config.js";
import { discoverOnvifDevices } from "./discovery.js";
import { claimPairing, reportDiscovery, type QrPayload } from "./pairing-client.js";

async function main() {
  const args = process.argv.slice(2);
  const pairIdx = args.indexOf("--pair");
  if (pairIdx === -1) {
    console.log("Foydalanish: npm run pair -- '<QR JSON>'");
    process.exit(1);
  }

  const qrRaw = args[pairIdx + 1];
  if (!qrRaw) {
    console.error("QR JSON berilmadi. Misol: npm run pair -- '{\"pairingId\":\"..\",\"token\":\"..\"}'");
    process.exit(1);
  }

  let qr: QrPayload;
  try {
    qr = JSON.parse(qrRaw) as QrPayload;
  } catch {
    console.error("QR JSON parse qilinmadi");
    process.exit(1);
  }

  const state = loadOrCreateState();
  console.log(`[gateway] ID: ${state.gatewayId}`);

  console.log("[pairing] Jarvis serveriga ulanmoqda...");
  await claimPairing(qr, state.gatewayId, state.publicKey, GATEWAY_NAME);
  console.log("[pairing] ✓ Pairing session claim qilindi");

  console.log(`[discovery] ONVIF WS-Discovery boshlandi (${DISCOVERY_TIMEOUT_MS}ms)...`);
  const devices = await discoverOnvifDevices(DISCOVERY_TIMEOUT_MS);
  console.log(`[discovery] ${devices.length} ta qurilma topildi`);

  if (devices.length === 0) {
    console.log("[discovery] Hech narsa topilmadi. Tekshiring: kamera va gateway bir subnetdami? ONVIF yoqilganmi?");
  }

  await reportDiscovery(qr.pairingId, state.gatewayId, devices);
  console.log("[pairing] Tugadi. Jarvis Mini App'da kamerani tanlab, login kiriting.");
}

main().catch((e) => {
  console.error("[gateway] Xato:", e instanceof Error ? e.message : e);
  process.exit(1);
});
