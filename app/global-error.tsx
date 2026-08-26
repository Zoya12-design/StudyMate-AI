"use client";

/**
 * FE-08 — last-resort boundary.
 *
 * `app/error.tsx` cannot catch a failure in the root layout itself, so this file
 * covers that case. It has to render its own <html> and <body> because the
 * layout it would normally inherit is the thing that failed. Tailwind classes
 * are avoided here for the same reason — inline styles cannot be broken by a
 * missing stylesheet.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf9f7",
          padding: "24px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#171717",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div style={{ fontSize: "32px" }}>⚠️</div>

          <h1
            style={{
              margin: "16px 0 8px",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            StudyMate AI could not start
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#737373",
            }}
          >
            The app failed to load before the interface could render. Reloading
            fixes this in almost every case.
          </p>

          {error?.digest && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
                color: "#a3a3a3",
              }}
            >
              reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              height: "44px",
              padding: "0 20px",
              borderRadius: "12px",
              border: "none",
              background: "#171717",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload StudyMate
          </button>
        </div>
      </body>
    </html>
  );
}
