"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useMediaUrl } from "@/lib/media";

export function DrawingImage({ image, alt, className }: { image: string; alt: string; className?: string }) {
  const src = useMediaUrl(image);
  const [failed, setFailed] = useState("");
  if (!src || failed === src) return <div className={`skeleton !rounded-none ${className ?? ""}`} role="img" aria-label={alt} />;
  return <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} className={className} />;
}
