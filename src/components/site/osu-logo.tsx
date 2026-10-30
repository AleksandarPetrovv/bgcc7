export function OsuLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="12" y="15.2" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="-0.3">
        osu!
      </text>
    </svg>
  );
}
