"use client";

import { useSyncExternalStore } from "react";
import { TWITCH_CHANNEL } from "@/lib/links";

const noop = () => () => {};

export function TwitchEmbed({ title }: { title: string }) {
  const host = useSyncExternalStore(noop, () => window.location.hostname, () => null);
  if (!host) return <div className="size-full bg-coal" />;
  return (
    <iframe
      title={title}
      src={`https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${host}&muted=true`}
      allowFullScreen
      className="size-full"
    />
  );
}
