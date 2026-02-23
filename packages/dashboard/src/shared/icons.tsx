export function HomeIcon({ className }: { className?: string }) {
  return (
    <span className={className}>
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="homeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="50%" stopColor="#764ba2" />
            <stop offset="100%" stopColor="#f093fb" />
          </linearGradient>
        </defs>
        <path d="M16 3L2 15h4v12h8v-8h4v8h8V15h4L16 3z" fill="url(#homeGrad)" />
      </svg>
    </span>
  );
}
