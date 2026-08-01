import Link from "next/link";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dev Nexus</h1>
      <p style={{ color: "#666" }}>One Platform. Complete Developer Control.</p>
      <Link href="/dashboard" style={{ padding: "10px 20px", background: "#111", color: "#fff", borderRadius: 6 }}>
        Open Dashboard
      </Link>
    </div>
  );
}
