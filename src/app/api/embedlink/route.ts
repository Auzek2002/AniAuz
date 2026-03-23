import { NextResponse } from "next/server";
import { load } from "cheerio";

export const runtime = "nodejs";

const DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";
const BASE   = `https://${DOMAIN}`;
const AJAX   = `${BASE}/ajax`;
const PREFIX = ["kaido.to", "9animetv.to", "4anime.gg"].includes(DOMAIN) ? "" : "/v2";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/plain, */*",
};

async function getEmbedLink(dataId: string, episodeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${AJAX}${PREFIX}/episode/sources?id=${dataId}`,
      { headers: { ...HEADERS, Referer: `${BASE}/watch/${episodeId}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.link || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("ep");

  if (!episodeId?.includes("?ep=")) {
    return NextResponse.json({ error: "Valid episode ID required" }, { status: 400 });
  }

  const epNum = episodeId.split("?ep=")[1];

  try {
    // Get server list HTML — we need data-id for each server
    const serversRes = await fetch(
      `${AJAX}${PREFIX}/episode/servers?episodeId=${epNum}`,
      { headers: { ...HEADERS, Referer: `${BASE}/watch/${episodeId}` } }
    );
    if (!serversRes.ok) throw new Error(`Servers request failed: ${serversRes.status}`);
    const serversJson = await serversRes.json();

    const $ = load(serversJson.html ?? "");

    // Collect all server data-ids from sub, then dub, in order
    const dataIds: string[] = [];
    $(".ps_-block.ps_-block-sub.servers-sub .server-item, .ps_-block.ps_-block-sub.servers-dub .server-item").each((_, el) => {
      const did = $(el).attr("data-id");
      if (did && !dataIds.includes(did)) dataIds.push(did);
    });

    if (dataIds.length === 0) {
      return NextResponse.json({ error: "No servers found for this episode" }, { status: 404 });
    }

    // Try each server and return the first link we get
    for (const dataId of dataIds) {
      const link = await getEmbedLink(dataId, episodeId);
      if (link) {
        return NextResponse.json({ link });
      }
    }

    return NextResponse.json({ error: "All servers failed to return an embed link" }, { status: 502 });
  } catch (err) {
    console.error("EmbedLink error:", (err as Error).message?.slice(0, 200));
    return NextResponse.json({ error: "Failed to fetch embed link" }, { status: 500 });
  }
}
