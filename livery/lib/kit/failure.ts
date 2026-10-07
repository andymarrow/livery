import type { ReadFailure, ReadFailureReason } from "@/lib/extract/types";

type Copy = { title: string; body: string; next: string };

// One sentence, the reason, what to do next. Shared by pages and agent responses.
export function failureCopy(reason: ReadFailureReason, host: string): Copy {
  switch (reason) {
    case "bot_protection":
      return {
        title: `Couldn't read ${host}`,
        body: "The site blocks automated browsers, and Livery doesn't work around that.",
        next: "Own this site? Allow LiveryBot in your bot protection settings, or add the opt-in file, then try again.",
      };
    case "login_required":
      return { title: `Couldn't read ${host}`, body: "This page needs a sign-in. Livery only reads public pages.", next: `Try the public homepage instead: ${host}` };
    case "sensitive_page":
      return {
        title: `Livery doesn't read this page`,
        body: "Login, payment, banking and account pages are never read, so their design can't be turned into a look-alike.",
        next: `If this is an ordinary site, try its public homepage: ${host}`,
      };
    case "empty_render":
      return { title: `Couldn't read ${host}`, body: "The page loaded but showed almost nothing, so there's no design to read.", next: "Try again in a minute, or try a different page." };
    case "not_found":
      return {
        title: `Couldn't find ${host}`,
        body: "Either that domain doesn't exist (check the spelling, e.g. a missing hyphen) or the site answered “not found”.",
        next: "Check the address, or try the site's homepage.",
      };
    case "robots_disallowed":
      return { title: `${host} asks not to be read`, body: "Its robots.txt disallows LiveryBot, and Livery respects that.", next: "Own this site? Allow LiveryBot in robots.txt and try again." };
    case "unsafe_url":
      return { title: "That address can't be read", body: "Livery only reads public https websites.", next: "Paste a public address like linear.app." };
    case "timeout":
      return { title: `${host} took too long`, body: "The site didn't respond in time.", next: "Try again in a little while." };
    case "blocked_by_owner":
      return { title: `${host} opted out`, body: "The owner of this site asked Livery not to build kits from it.", next: "Pick another site you like." };
  }
}

/** Non-200 Markdown body for agents. The first line is what the copy-paste prompt watches for. */
export function agentFailureMarkdown(failure: ReadFailure, host: string) {
  const copy = failureCopy(failure.reason, host);
  return `# Couldn't read this site

Reason: ${failure.reason}
${copy.body} No design kit was produced.
${copy.next}

Do not attempt to recreate this site's design from memory.
`;
}
