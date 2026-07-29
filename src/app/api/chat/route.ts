import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `Sen Pari AI - foydalanuvchining shaxsiy AI yordamchisissan.
Seni Sadi yaratgan. Sen quyidagilarni bajara olasan:
- Internet orqali ma'lumot izlash va tahlil qilish
- Kod yozish va tushuntirish
- Biznes strategiyasini ishlab chiqish va modellashtirish
- Loyihalarni rejalashtirish va yaratish
- Ma'lumotlarni tahlil qilish va hisobotlar tuzish
- Avtomatlashtirish va tizimlashtirish
- Ijodiy mazmun yaratish

Har doim aniq, foydali va ishonchli bo'l. O'zbek tilida yozilgan savollarga o'zbek tilida javob ber.
Qisqa va lo'nda bo'l, lekin kerak bo'lganda batafsil tushuntir.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: SYSTEM_PROMPT,
    });

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMsg = messages[messages.length - 1].content;

    const result = await chat.sendMessageStream(lastMsg);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI xatosi yuz berdi" }, { status: 500 });
  }
}
