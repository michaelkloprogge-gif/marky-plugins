/* marky-plugin
{
  "id": "emoji-shortcodes",
  "name": "Emoji shortcodes",
  "version": "1.0.0",
  "description": "Shows :smile:, :tada:, :rocket: and other shortcodes as emoji in the preview.",
  "author": "Marky examples",
  "category": "writing",
  "permissions": ["markdown"]
}
*/

// Example plugin: a Markdown transform. It edits the syntax tree (mdast) before
// rendering; the file itself is unchanged and the output is still sanitised.
const EMOJI = {
  smile: '😄', grin: '😁', joy: '😂', wink: '😉', heart: '❤️', thumbsup: '👍', '+1': '👍',
  thumbsdown: '👎', '-1': '👎', tada: '🎉', rocket: '🚀', fire: '🔥', star: '⭐', warning: '⚠️',
  check: '✅', white_check_mark: '✅', x: '❌', bulb: '💡', eyes: '👀', wave: '👋', coffee: '☕',
  bug: '🐛', sparkles: '✨', memo: '📝', calendar: '📅', lock: '🔒', thinking: '🤔', 100: '💯',
};

function walk(node) {
  // Leave code alone: `:smile:` inside code should stay literal
  if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') return;
  if (node.type === 'text') {
    node.value = node.value.replace(/:([a-z0-9_+-]+):/g, (match, name) => EMOJI[name] || match);
  }
  if (Array.isArray(node.children)) node.children.forEach(walk);
}

Marky.definePlugin({
  activate(marky) {
    marky.markdown.transform((tree) => {
      walk(tree);
      return tree;
    });
  },
});
