import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Umbra Codex",
    short_name: "Umbra",
    description: "Fichas e campanhas para RPG de fantasia sombria.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07070b",
    theme_color: "#09080e",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
