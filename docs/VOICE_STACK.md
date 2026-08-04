# PARI Voice Stack — bosqichma-bosqich

## Hozirgi holat (Phase 0 — majburiy)
ElevenLabs **ishlamayapti**, chunki production container:
```json
"ELEVENLABS_API_KEY not set"
```
Bu SDK yoki LiveKit muammosi emas — **Railway Variables ishlayotgan servicega yopishmagan / redeploy bo‘lmagan**.

### Phase 0 checklist
1. Railway → **ochilayotgan URL** qaysi service bo‘lsa — shu
2. Variables:
   - `ELEVENLABS_API_KEY` = `sk_...` (API Keys dan, workspace ID emas)
   - `ELEVENLABS_VOICE_ID`
   - `ELEVENLABS_MODEL_ID=eleven_multilingual_v2`
3. Branch **main** → **Redeploy**
4. `GET /api/tts` → `configured: true`
5. `GET /api/tts?mode=welcome` → audio/mpeg

Rasmiy REST (biz ishlatamiz):
`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
Header: `xi-api-key`

SDK lar (`elevenlabs-js`, `elevenlabs-python`) shu REST ustida — avval REST ishlashi shart.

---

## Phase 1 — Pari ichida (1–2 kun)
| Funksiya | Qanday |
|----------|--------|
| TTS o‘zbek | ElevenLabs multilingual ✅ kod |
| STT | `/api/stt` (Groq/whisper) |
| Chat voice | `useVoice` + TTS javob |
| Clap / welcome | `useClapTrigger` + `/api/tts?mode=welcome` |
| TG voice | Bot audio message → STT → javob TTS |

Manbalar:
- [elevenlabs-js](https://github.com/elevenlabs/elevenlabs-js)
- [elevenlabs-examples](https://github.com/elevenlabs/elevenlabs-examples)

---

## Phase 2 — Real-time suhbat (keyin)
| Qatlam | Texnologiya |
|--------|-------------|
| Transport | [LiveKit Agents](https://github.com/livekit/agents) |
| Pipeline | [Pipecat](https://github.com/pipecat-ai/pipecat) |
| LLM | OpenAI Realtime / mavjud provider chain |
| TTS | ElevenLabs streaming |
| Memory | vault + Mem0-style |

Imkoniyatlar: interrupt, past latency, “Pari” wake word (client VAD).

---

## Phase 3 — Kengaytirish
- Voice clone (ElevenLabs instant clone)
- Emotion / style in voice_settings
- WhatsApp / telefon (Vapi yoki Twilio + Pipecat)
- Meeting assistant

---

## Nima qilinmaydi hozir
Butun LiveKit + Pipecat + Vapi ni bir kunda ulash — TTS kaliti ishlamaguncha foyda yo‘q.

**Tartib:** Phase 0 ishlasin → Phase 1 silliqlansin → Phase 2 real-time.
