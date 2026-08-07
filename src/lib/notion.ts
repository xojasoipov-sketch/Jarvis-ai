/**
 * Notion API integration
 * NOTION_TOKEN — Integration token from https://www.notion.so/my-integrations
 * NOTION_DATABASE_ID — Default database for knowledge base
 */

const BASE = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

function headers() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN sozlanmagan");
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": VERSION,
    "Content-Type": "application/json",
  };
}

export function notionConfigured() {
  return Boolean(process.env.NOTION_TOKEN);
}

/** Sahifani qidirish */
export async function notionSearch(query: string, limit = 10) {
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, page_size: limit }),
  });
  if (!res.ok) throw new Error(`Notion search xatosi: ${res.status}`);
  const data = await res.json();
  return (data.results || []) as Record<string, unknown>[];
}

/** Database ga yangi sahifa (yozuv) qo'shish */
export async function notionCreatePage(
  databaseId: string,
  title: string,
  content: string,
  properties?: Record<string, unknown>
) {
  const dbId = databaseId || process.env.NOTION_DATABASE_ID;
  if (!dbId) throw new Error("NOTION_DATABASE_ID sozlanmagan");

  const res = await fetch(`${BASE}/pages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        title: { title: [{ text: { content: title } }] },
        ...properties,
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
          },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Notion page yaratish xatosi: ${res.status}`);
  return res.json();
}

/** Sahifani o'qish */
export async function notionGetPage(pageId: string) {
  const res = await fetch(`${BASE}/pages/${pageId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Notion get page xatosi: ${res.status}`);
  return res.json();
}

/** Database yozuvlarini ro'yxat */
export async function notionQueryDatabase(databaseId?: string, limit = 20) {
  const dbId = databaseId || process.env.NOTION_DATABASE_ID;
  if (!dbId) throw new Error("NOTION_DATABASE_ID sozlanmagan");
  const res = await fetch(`${BASE}/databases/${dbId}/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ page_size: limit }),
  });
  if (!res.ok) throw new Error(`Notion query xatosi: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}
