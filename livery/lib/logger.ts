// Structured one-line JSON logs. Vercel and most hosts index these directly.
type Fields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};

/** A readable message for anything thrown, including Supabase/PostgREST error objects. */
export function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    return [e.code, e.message, e.details, e.hint].filter(Boolean).join(" | ") || JSON.stringify(error);
  }
  return String(error);
}
