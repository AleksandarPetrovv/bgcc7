"use server";

import { signIn, signOut } from "@/auth";

export async function login(redirectTo: string) {
  await signIn("osu", { redirectTo: /^\/(?![/\\])/.test(redirectTo) ? redirectTo : "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
