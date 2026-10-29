import { useId } from 'react';

/**
 * Logo "Bengkelku" — gear dengan kunci inggris diagonal.
 * SVG lengkap (sudah termasuk latar kotak gradien), otomatis
 * menyesuaikan ukuran elemen pembungkusnya.
 */
export default function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const gradId = `bengkelku-grad-${id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Logo Bengkelku"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5aa7ff" />
          <stop offset="1" stopColor="#1a5fd9" />
        </linearGradient>
      </defs>

      {/* Latar kotak melengkung dengan gradien */}
      <rect width="64" height="64" rx="18" fill={`url(#${gradId})`} />

      {/* Gear */}
      <g transform="translate(32 34)">
        <circle
          r="11.5"
          stroke="#fff"
          strokeWidth="8"
          strokeDasharray="7.5 4.53"
          transform="rotate(15)"
          fill="none"
        />
        <circle r="12" fill="#fff" />
        <circle r="4.6" fill={`url(#${gradId})`} />
      </g>

      {/* Kunci inggris diagonal */}
      <g transform="translate(32 34) rotate(45)">
        <circle
          cx="0"
          cy="-17.5"
          r="8"
          fill="#fff"
          stroke={`url(#${gradId})`}
          strokeWidth="2.4"
        />
        <rect
          x="-3.2"
          y="-28"
          width="6.4"
          height="12.5"
          rx="1.8"
          fill={`url(#${gradId})`}
        />
        <rect
          x="-3.4"
          y="-12"
          width="6.8"
          height="24"
          rx="3.4"
          fill="#fff"
          stroke={`url(#${gradId})`}
          strokeWidth="2.4"
        />
      </g>
    </svg>
  );
}
