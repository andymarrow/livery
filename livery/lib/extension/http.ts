import "server-only";
import { NextResponse } from "next/server";
import { extensionUser } from "./tokens";

// Responses for the extension's API. The extension calls from its own origin
// (chrome-extension://…) with a Bearer token; no cookies are involved.

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function requireExtensionUser(request: Request) {
  const user = await extensionUser(request.headers);
  return user ?? null;
}

export const unauthorized = () => json({ error: "Connect the extension to your Livery account again.", code: "unauthorized" }, 401);
