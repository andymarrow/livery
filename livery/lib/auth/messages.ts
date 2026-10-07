/** Supabase's auth errors, in words a person can act on. */
export function authMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them, or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first: we sent you a link when you signed up.";
  if (m.includes("already registered") || m.includes("already been registered")) return "There's already an account with that email. Sign in instead.";
  if (m.includes("password should") || m.includes("weak")) return "Choose a stronger password: at least 8 characters, not a common one.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (m.includes("same password") || m.includes("different from the old")) return "Choose a password you haven't used here before.";
  return "Something went wrong. Try again in a moment.";
}
