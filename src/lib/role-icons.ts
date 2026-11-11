import { Brush, Crown, Gamepad2, Gavel, Map as MapIcon, Mic, Palette, Radio, Wrench } from "lucide-react";
import type { Role } from "./roles";

export const ROLE_ICON: Record<Role, typeof Crown> = { host: Crown, referee: Gavel, mappooler: MapIcon, playtester: Gamepad2, streamer: Radio, commentator: Mic, technical: Wrench, leadDesign: Palette, designer: Brush };
