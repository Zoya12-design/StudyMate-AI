export function HeroFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 45%, #1a1f38 0%, #0b0f1a 70%)",
      }}
      aria-hidden="true"
    >
      <svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* static approximation of the knowledge-core network */}
        <polygon
          points="110,30 170,70 170,150 110,190 50,150 50,70"
          stroke="#7C5CFC"
          strokeWidth="1.5"
          fill="rgba(124,92,252,0.08)"
        />
        {[
          [110, 30],
          [170, 70],
          [170, 150],
          [110, 190],
          [50, 150],
          [50, 70],
          [110, 110],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 6 ? 5 : 3} fill="#38E8E0" />
        ))}
      </svg>
    </div>
  );
}
