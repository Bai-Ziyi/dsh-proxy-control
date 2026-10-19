/** One `NAME=value` line carrying any proxy variable this plugin owns. */
export const PROXY_LINE = /^\s*(?:export\s+)?(?:https?_proxy|all_proxy|no_proxy)\s*=/iu;

/**
 * Compute the next `.env` body with this plugin's proxy lines replaced.
 *
 * Every proxy variable is removed first, including lowercase and `ALL_PROXY`
 * spellings, so an old hand-edited line cannot survive beside the new one.
 * Unrelated lines keep their order, and a trailing blank line is trimmed
 * before the new block is appended.
 *
 * @param current - the existing file body, or an empty string.
 * @param next - the switch state to write.
 * @returns the new file body, ending in a newline unless it is empty.
 */
export function rewrite(current, next) {
  const kept = String(current).split(/\r?\n/u).filter((line) => !PROXY_LINE.test(line));
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
  if (next.enabled) {
    kept.push(`HTTP_PROXY=${next.url}`, `HTTPS_PROXY=${next.url}`);
    if (next.noProxy !== '') kept.push(`NO_PROXY=${next.noProxy}`);
  }
  return kept.length === 0 ? '' : `${kept.join('\n')}\n`;
}
