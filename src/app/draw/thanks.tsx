"use client";

import { useFormat } from "@/components/site/tournament";
import { editionNumber } from "@/lib/format";
import { StageFrame } from "@/app/overlay/[key]/overlay-view";
import { ThanksScene } from "@/app/overlay/[key]/calm-scenes";

/** the draw's closing screen: the overlay's "thanks for watching", full window for viewers, a 16:9 view in the admin page (`inline`) */
export function DrawThanks({ inline }: { inline?: boolean }) {
  const f = useFormat();
  return (
    <StageFrame inline={inline}>
      <ThanksScene num={editionNumber(f.edition) || "7"} />
    </StageFrame>
  );
}
