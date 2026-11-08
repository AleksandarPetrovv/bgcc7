"use client";

import { createContext, useContext } from "react";

export const ResultsEye = createContext(true);
export const useResultsEye = () => useContext(ResultsEye);

/**
 * `current`: the match on stream, outlined in gold. `reveal`: finished matches the bracket plays one after another:
 * shown unplayed, zoomed in on, then their result (teams moving on or out)
 */
export const BracketOptions = createContext<{ maxH?: number; reset: boolean; current?: string; reveal?: string[] }>({ reset: true });
export const useBracketOptions = () => useContext(BracketOptions);
