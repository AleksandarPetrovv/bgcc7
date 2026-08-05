export const ADMINS = [23913323, 7572321];

export const isAdmin = (osuId: number | null) => osuId !== null && ADMINS.includes(osuId);
