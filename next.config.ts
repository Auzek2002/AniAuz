import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@consumet/extensions", "aniwatch"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img.anili.st" },
      { protocol: "https", hostname: "media.kitsu.app" },
      { protocol: "https", hostname: "gogocdn.net" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "artworks.thetvdb.com" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "cdn.noitatnemucod.net" },
      { protocol: "https", hostname: "i.animepahe.si" },
    ],
  },
};

export default nextConfig;
