import { drawFeed, onDraw } from "@/db/draw";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// public: the draw is shown on stream anyway, and OBS has no login
export const GET = (req: Request) => sse(req, drawFeed, onDraw, 5000);
