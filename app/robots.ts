import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/cadastro"],
        disallow: [
          "/admin/",
          "/campanhas/",
          "/dashboard/",
          "/fichas/",
          "/npcs/",
          "/perfil/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://umbra-codex.vercel.app/sitemap.xml",
    host: "https://umbra-codex.vercel.app",
  };
}
