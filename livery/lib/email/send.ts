import "server-only";
import { request } from "node:https";
import { logger } from "@/lib/logger";

// Livery's email goes out through Resend's API. One key (RESEND_API_KEY), no
// SMTP settings or dashboard templates: the templates live in this folder.

const FROM = process.env.EMAIL_FROM ?? "Livery <hello@livery.site>";

// Plain node:https over IPv4. Some networks (seen in local development) route
// IPv6 into a black hole, and fetch then times out instead of falling back.
function post(path: string, body: string, key: string) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = request(
      { host: "api.resend.com", path, method: "POST", family: 4, timeout: 15_000, headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "content-length": Buffer.byteLength(body) } },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await post("/emails", JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html, text: input.text }), key);
  if (res.status < 200 || res.status >= 300) {
    logger.error("email.send_failed", { status: res.status, detail: res.text.slice(0, 300) });
    throw new Error(`email not sent (${res.status})`);
  }
}
