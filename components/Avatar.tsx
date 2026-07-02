"use client";

import { useState } from "react";

const COLORS = [
  "#4dabf7", "#f783ac", "#69db7c", "#ffd43b", "#da77f2",
  "#ff8787", "#3bc9db", "#ffa94d", "#9775fa", "#63e6be",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function Avatar({
  src,
  name,
  size = 40,
  rounded = "rounded-lg",
}: {
  src?: string | null;
  name: string;
  size?: number;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const px = { width: size, height: size };

  if (!src || failed) {
    return (
      <div
        className={`${rounded} flex items-center justify-center font-semibold text-white shrink-0 select-none`}
        style={{ ...px, background: colorFor(name), fontSize: size * 0.42 }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${rounded} object-cover shrink-0 bg-surface-2`}
      style={px}
    />
  );
}
