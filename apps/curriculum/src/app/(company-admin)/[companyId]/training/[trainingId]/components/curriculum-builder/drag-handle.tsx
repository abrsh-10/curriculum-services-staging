export function DragHandle({ size = "md" }: { size?: "sm" | "md" }) {
  const w = size === "sm" ? 12 : 16
  const h = size === "sm" ? 18 : 24
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {size === "sm" ? (
        <>
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="9" r="1.5" />
          <circle cx="9" cy="9" r="1.5" />
          <circle cx="3" cy="15" r="1.5" />
          <circle cx="9" cy="15" r="1.5" />
        </>
      ) : (
        <>
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="10" r="1.5" />
          <circle cx="11" cy="10" r="1.5" />
          <circle cx="5" cy="16" r="1.5" />
          <circle cx="11" cy="16" r="1.5" />
          <circle cx="5" cy="22" r="1.5" />
          <circle cx="11" cy="22" r="1.5" />
        </>
      )}
    </svg>
  )
}
