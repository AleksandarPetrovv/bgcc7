"use client";

import { useEffect, useState } from "react";
import { TWITCH_CHANNEL } from "@/lib/links";

export function TwitchEmbed({ title }: { title: string }) {
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setHost(window.location.hostname), document.documentElement.classList.contains("lite") ? 1300 : 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative size-full bg-coal">
      {!host && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="size-3 animate-pulse rotate-45 bg-rose/60" />
        </div>
      )}
      {host && (
        <iframe
          title={title}
          src={`https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${host}&muted=true`}
          allowFullScreen
          className="anim-appear size-full"
        />
      )}
    </div>
  );
}
