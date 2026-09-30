import { ImageResponse } from "next/og";

export const alt = "Umbra Codex — fichas e campanhas de RPG de fantasia sombria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 80% 10%, #38215c 0, #0b0911 48%, #050507 100%)",
          color: "#f4f1fb",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(167,139,250,.32)",
            borderRadius: "40px",
            display: "flex",
            flexDirection: "column",
            padding: "64px",
            width: "100%",
          }}
        >
          <div style={{ color: "#c4b5fd", display: "flex", fontSize: 30, letterSpacing: 6 }}>
            UMBRA CODEX
          </div>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, marginTop: 28 }}>
            Toda jornada deixa uma marca na alma.
          </div>
          <div style={{ color: "#a1a1aa", display: "flex", fontSize: 30, marginTop: 34 }}>
            Fichas, campanhas e segredos protegidos.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
