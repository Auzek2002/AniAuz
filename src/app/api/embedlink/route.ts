import { NextResponse } from "next/server";
import { HiAnime } from "aniwatch";

export const runtime = "nodejs";

const DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";
const SRC_AJAX_URL = `https://${DOMAIN}/ajax`;
const VERSION_PREFIX = ["kaido.to", "9animetv.to", "4anime.gg"].includes(DOMAIN) ? "" : "/v2";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("ep");

  if (!episodeId || !episodeId.includes("?ep=")) {
    return NextResponse.json({ error: "Valid episode ID required" }, { status: 400 });
  }

  const hianime = new HiAnime.Scraper();

  try {
    // Step 1: get available servers for this episode
    const servers = await hianime.getEpisodeServers(episodeId);

    // Try sub first, then dub, then raw
    const candidates = [...servers.sub, ...servers.dub, ...servers.raw];
    const server = candidates.find(s => s.serverId !== null);

    if (!server?.serverId) {
      return NextResponse.json({ error: "No servers available for this episode" }, { status: 404 });
    }

    // Step 2: fetch the raw embed link — this is BEFORE the broken megacloud decryption
    const res = await fetch(
      `${SRC_AJAX_URL}${VERSION_PREFIX}/episode/sources?id=${server.serverId}`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `https://${DOMAIN}/watch/${episodeId}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `HiAnime sources request failed: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    if (!data.link) {
      return NextResponse.json({ error: "No embed link returned" }, { status: 404 });
    }

    return NextResponse.json({ link: data.link, server: server.serverName });
  } catch (err) {
    console.error("EmbedLink error:", (err as Error).message?.slice(0, 150));
    return NextResponse.json({ error: "Failed to fetch embed link" }, { status: 500 });
  }
}
