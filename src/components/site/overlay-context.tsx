"use client";

import { createContext, useContext } from "react";

export const ResultsEye = createContext(true);
export const useResultsEye = () => useContext(ResultsEye);

/**
 * `current`: the match on stream, outlined in gold. `reveal`: finished matches the bracket plays one after another:
 * shown unplayed, zoomed in on, then their result (teams moving on or out). `reset` omitted: drawn only once the losers side won the grand final.
 * `zoomed`: once no reveal is playing, zoom onto `current` the way a reveal does. `onSettled`: a reveal or a zoom finished animating
 */
export const BracketOptions = createContext<{
  maxH?: number;
  reset?: boolean;
  current?: string;
  reveal?: string[];
  zoomed?: boolean;
  onSettled?: (kind: "reveal" | "zoom", on?: boolean) => void;
}>({});
export const useBracketOptions = () => useContext(BracketOptions);
