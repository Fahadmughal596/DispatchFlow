import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#08154A", color: "#FFFFFF", fontSize: 15, fontWeight: 800, borderRadius: 7 }}>
        DF
      </div>
    ),
    size
  );
}
