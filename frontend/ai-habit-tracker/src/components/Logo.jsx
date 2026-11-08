/**
 * Logo — the AI Habit Tracker brand mark.
 * Renders as an inline SVG so it inherits parent sizing and needs no image request.
 * Usage:
 *   <Logo size={36} />          — square mark only
 *   <Logo size={36} withText /> — mark + "AI Habit Tracker" wordmark beside it
 */
export default function Logo({ size = 36, withText = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* ── Brand mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logo-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d1f04" />
            <stop offset="100%" stopColor="#1c1408" />
          </linearGradient>
        </defs>

        {/* Rounded square background */}
        <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />

        {/* Habit-loop ring — 270° arc, gap bottom-right */}
        <circle
          cx="32" cy="32" r="20"
          stroke="url(#logo-ring)" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="94 31"
          strokeDashoffset="24"
          transform="rotate(-210 32 32)"
        />

        {/* Checkmark */}
        <path
          d="M22 32 L29 39 L43 25"
          stroke="#fbbf24" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* AI spark dots */}
        <circle cx="48" cy="17" r="3" fill="#fde68a" opacity="0.95" />
        <circle cx="54" cy="23" r="2" fill="#f59e0b" opacity="0.75" />

        {/* Streak flame in ring gap */}
        <path
          d="M35 53 Q38 47 32 44 Q26 47 29 53 Q31 49 32 51 Q33 49 35 53Z"
          fill="#fbbf24" opacity="0.8"
        />
      </svg>

      {/* ── Optional wordmark ── */}
      {withText && (
        <span className="font-semibold tracking-tight leading-none select-none">
          AI Habit Tracker
        </span>
      )}
    </span>
  );
}
