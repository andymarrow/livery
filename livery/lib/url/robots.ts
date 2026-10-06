// robots.txt matching per RFC 9309: pick the group for our product token
// (falling back to "*"), then the longest matching rule wins; on a tie, allow wins.

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };

export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      if (!current) continue;
      if (field === "disallow" && value === "") continue; // "Disallow:" means allow everything
      current.rules.push({ allow: field === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function patternToRegExp(pattern: string) {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export function isAllowedByRobots(text: string, productToken: string, pathWithQuery: string) {
  const groups = parseRobots(text);
  const token = productToken.toLowerCase();
  const own = groups.filter((g) => g.agents.some((agent) => agent !== "*" && token.startsWith(agent)));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);

  let best: Rule | null = null;
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathWithQuery)) continue;
    const length = rule.pattern.replace(/\*/g, "").length;
    const bestLength = best ? best.pattern.replace(/\*/g, "").length : -1;
    if (length > bestLength || (length === bestLength && rule.allow && !best?.allow)) best = rule;
  }
  return best ? best.allow : true;
}
