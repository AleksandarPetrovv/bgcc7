"use client";

import { MARKS, type Mark } from "./title-marks";

export function PageTitle({
  children,
  accent,
  right,
  mark,
}: {
  children: React.ReactNode;
  mark: Mark;
  accent?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const M = MARKS[mark];
  // the word joiner keeps the mark on the same line as the last word
  const mk = (
    <>
      {"⁠"}
      <span className="ml-[0.4em] inline-flex items-end align-bottom">
        <M />
      </span>
    </>
  );
  return (
    <div className="no-enter relative mb-6 flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 sm:mb-8 sm:gap-y-4">
      <h1 className="heading-slam min-w-0 max-w-full break-words text-[clamp(2rem,8.5vw,3rem)] sm:text-6xl">
        <span className="anim-letter">
          {children}
          {!accent && mk}
        </span>
        {accent && (
          <>
            {" "}
            <span className="anim-letter text-rose-hi" style={{ animationDelay: "0.12s" }}>
              / {accent}
              {mk}
            </span>
          </>
        )}
      </h1>
      {right && (
        <div className="anim-rise ml-auto flex flex-wrap items-center gap-3" style={{ animationDelay: "0.15s" }}>
          {right}
        </div>
      )}
      <span className="anim-grow-x absolute inset-x-0 bottom-0 h-px bg-line" aria-hidden />
    </div>
  );
}
