export const avatarPath = (id: number | string, anim?: boolean) => `/api/av/${id}${anim ? "?anim=1" : ""}`;
