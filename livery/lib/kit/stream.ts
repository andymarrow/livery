/** Reads a newline-delimited JSON response, calling `onEvent` for each line as it arrives. */
export async function readEvents<T>(response: Response, onEvent: (event: T) => void, isCancelled: () => boolean = () => false) {
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!isCancelled()) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as T);
  }
}
