export function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeOpacity="0.3" />
      <circle cx="24" cy="24" r="15" stroke="currentColor" strokeOpacity="0.18" />
      <path d="M24 3 L26.5 24 L24 45 L21.5 24 Z" fill="currentColor" fillOpacity="0.92" />
      <path d="M3 24 L24 21.5 L45 24 L24 26.5 Z" fill="currentColor" fillOpacity="0.5" />
      <path d="M10 10 L24.5 23.5 L38 38 L23.5 24.5 Z" fill="currentColor" fillOpacity="0.28" />
      <path d="M38 10 L24.5 24.5 L10 38 L23.5 23.5 Z" fill="currentColor" fillOpacity="0.28" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" />
    </svg>
  );
}
