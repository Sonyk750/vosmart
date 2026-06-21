import { ImageResponse } from "next/og"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050814",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.3) 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(ellipse 60% 40% at 90% 110%, rgba(6,182,212,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 60, height: 60, borderRadius: 16,
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, color: "white", fontWeight: "bold",
            }}
          >
            V
          </div>
          <span style={{ fontSize: 52, fontWeight: 700, color: "white", letterSpacing: -1 }}>
            VoSmart
          </span>
        </div>

        {/* Titlu */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          Firmă de Cenzorat pentru Asociații de Proprietari
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {[
            { label: "Rapoarte Online", color: "#6ee7b7" },
            { label: "Portal 24/7", color: "#67e8f9" },
            { label: "Legea 196/2018", color: "#a78bfa" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: `1px solid ${item.color}40`,
                background: `${item.color}15`,
                color: item.color,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 40, fontSize: 22, color: "rgba(255,255,255,0.35)" }}>
          vosmart.ro
        </div>
      </div>
    ),
    { ...size }
  )
}
