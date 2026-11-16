/* marky-plugin
{
  "id": "word-goal",
  "name": "Word goal",
  "version": "1.0.0",
  "description": "Set a word-count target and see your progress in the status bar.",
  "author": "Marky examples",
  "permissions": ["document:read", "statusBar", "storage"]
}
*/

// Example plugin: a command, the status bar, document events and storage.
Marky.definePlugin({
  async activate(marky) {
    let goal = Number(await marky.storage.get('goal')) || 500;
    let words = 0;

    const show = () => {
      const pct = Math.min(100, Math.round((words / goal) * 100));
      marky.statusBar.set(`🎯 ${words} / ${goal} words (${pct}%)`, {
        title: 'Word goal — change it with “Word goal: set target” in the command palette',
      });
    };

    marky.document.onChange((doc) => {
      const before = words;
      words = doc.words;
      show();
      if (before < goal && words >= goal) marky.ui.toast(`Goal of ${goal} words reached 🎉`);
    });

    marky.commands.register({
      id: 'set-target',
      title: 'Word goal: set target',
      async run() {
        const answer = await marky.ui.prompt('Words to aim for', String(goal));
        if (!answer) return;
        const n = Number(answer);
        if (!Number.isInteger(n) || n <= 0) {
          marky.ui.toast('Enter a whole number above 0');
          return;
        }
        goal = n;
        await marky.storage.set('goal', n);
        show();
      },
    });

    show();
  },
});
