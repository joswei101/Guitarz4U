"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#fff", fontFamily: "system-ui", textAlign: "center", padding: "6rem 1rem" }}>
        <h1>Guitarz4U is temporarily unavailable</h1>
        <p style={{ color: "#b5b5b5" }}>Please try again in a moment, or WhatsApp us on 064 856 7019.</p>
        <button onClick={reset} style={{ marginTop: 24, background: "#ff9f1c", border: 0, padding: "12px 20px", borderRadius: 6, fontWeight: 700 }}>Try again</button>
      </body>
    </html>
  );
}
