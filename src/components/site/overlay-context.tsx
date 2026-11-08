"use client";

import { createContext, useContext } from "react";

export const ResultsEye = createContext(true);
export const useResultsEye = () => useContext(ResultsEye);

export const BracketOptions = createContext<{ maxH?: number; reset: boolean }>({ reset: true });
export const useBracketOptions = () => useContext(BracketOptions);
