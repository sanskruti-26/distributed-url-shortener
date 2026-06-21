export default function NotFound() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Link not found</h1>
      <p style={{ color: "#666" }}>
        This short link doesn't exist or may have been removed.
      </p>
      <a href="/" style={{ color: "#111", textDecoration: "underline" }}>
        Go back home
      </a>
    </main>
  );
}
