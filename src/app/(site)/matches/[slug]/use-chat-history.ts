"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatLine } from "@/lib/bancho";
import { chatOverlaps, isChatHistoryPage, mergeChatLines } from "./chat-lines";

type Page = { before: number | null; hasMore: boolean; loaded: boolean; loading: boolean; failed: boolean };
type Anchor = { key: string; top: number };

export function useChatHistory(slug: string, mpId: number | null, recent: ChatLine[]) {
  const box = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const anchor = useRef<Anchor | null>(null);
  const mounted = useRef(false);
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const previous = useRef(recent);
  const [entries, setEntries] = useState(() => mergeChatLines([], recent));
  const [page, setPage] = useState<Page>({ before: null, hasMore: mpId != null, loaded: false, loading: mpId != null, failed: false });
  const cursor = useRef(page);

  const invalidate = useCallback(() => {
    epoch.current++;
    request.current?.abort();
    request.current = null;
  }, []);

  const capture = useCallback(() => {
    const el = box.current;
    if (!el || following.current) return;
    const top = el.getBoundingClientRect().top;
    const row = Array.from(el.querySelectorAll<HTMLElement>("[data-chat-key]")).find((row) => row.getBoundingClientRect().bottom > top);
    if (row) anchor.current = { key: row.dataset.chatKey!, top: row.getBoundingClientRect().top - top };
  }, []);

  const loadMore = useCallback(async () => {
    if (!mounted.current || mpId == null || request.current || (cursor.current.loaded && !cursor.current.hasMore)) return;
    const controller = new AbortController();
    request.current = controller;
    const generation = epoch.current;
    const before = cursor.current.loaded ? cursor.current.before : null;
    capture();
    setPage((p) => ({ ...p, loading: true, failed: false }));
    try {
      const res = await fetch(`/api/lobby/${slug}/chat${before == null ? "" : `?before=${before}`}`, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("chat history failed");
      const data: unknown = await res.json();
      if (!mounted.current || controller.signal.aborted || generation !== epoch.current) return;
      if (!isChatHistoryPage(data)) throw new Error("invalid chat history");
      if (data.mpId !== mpId || (data.hasMore && (data.before == null || data.before <= 0 || (before != null && data.before >= before)))) throw new Error("chat history cursor changed");
      capture();
      setEntries((current) => mergeChatLines(current, data.lines));
      if (!previous.current.length && data.lines.length) previous.current = data.lines;
      const next = { before: data.before, hasMore: data.hasMore, loaded: true, loading: false, failed: false };
      cursor.current = next;
      setPage(next);
    } catch {
      if (mounted.current && !controller.signal.aborted && generation === epoch.current) {
        capture();
        setPage((p) => ({ ...p, loading: false, failed: true }));
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [capture, mpId, slug]);

  useEffect(() => {
    mounted.current = true;
    const id = setTimeout(() => void loadMore(), 0);
    return () => {
      clearTimeout(id);
      mounted.current = false;
      invalidate();
    };
  }, [invalidate, loadMore]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      capture();
      if (mpId != null && recent.length && previous.current.length && !chatOverlaps(previous.current, recent)) {
        invalidate();
        const ids = recent.flatMap((line) => line.id == null ? [] : [line.id]);
        const before = ids.length ? Math.min(...ids) : null;
        const next = { before, hasMore: true, loaded: before != null, loading: false, failed: false };
        cursor.current = next;
        setPage(next);
      }
      if (recent.length) previous.current = recent;
      setEntries((current) => mergeChatLines(current, recent));
    });
    return () => cancelAnimationFrame(id);
  }, [capture, invalidate, mpId, recent]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (following.current) el.scrollTop = el.scrollHeight;
    else if (anchor.current) {
      const saved = anchor.current;
      const row = Array.from(el.querySelectorAll<HTMLElement>("[data-chat-key]")).find((row) => row.dataset.chatKey === saved.key);
      if (row) el.scrollTop += row.getBoundingClientRect().top - el.getBoundingClientRect().top - saved.top;
    }
    anchor.current = null;
  });

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    if (el.scrollTop < 80 && !page.loading && !page.failed && page.hasMore) void loadMore();
  };

  return { box, entries, page, loadMore, onScroll };
}
