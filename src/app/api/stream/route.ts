import { NextResponse } from "next/server";
import { HiAnime } from "aniwatch";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnimeServers = "hd-1" | "hd-2" | "megacloud" | "streamsb" | "streamtape";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("ep");
  const server = (searchParams.get("server") as AnimeServers) || "hd-1";
  const category = (searchParams.get("category") as "sub" | "dub") || "sub";

  if (!episodeId) {
    return NextResponse.json({ error: "Episode ID required" }, { status: 400 });
  }

  const hianime = new HiAnime.Scraper();
  const servers: AnimeServers[] = ["hd-1", "hd-2", "megacloud", "streamtape", "streamsb"];
  const tryOrder = [server, ...servers.filter(s => s !== server)];

  for (const srv of tryOrder) {
    try {
      const streamData = await hianime.getEpisodeSources(episodeId, srv, category);
      if (streamData?.sources && streamData.sources.length > 0) {
        return NextResponse.json(streamData);
      }
    } catch (err) {
      console.error(`Server ${srv} failed:`, (err as Error).message?.slice(0, 100));
    }
  }

  return NextResponse.json({ error: "No stream sources found for this episode" }, { status: 404 });
}
