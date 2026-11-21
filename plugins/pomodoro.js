/* marky-plugin
{
  "id": "pomodoro",
  "name": "Focus timer",
  "version": "1.0.0",
  "description": "A Pomodoro timer in the status bar: 25 minutes of writing, then a 5-minute break. Start, pause and set the lengths from the command palette.",
  "author": "Marky",
  "category": "productivity",
  "details": "Commands: \"Focus timer: start or pause\", \"Focus timer: reset\" and \"Focus timer: set lengths\". The status bar shows the time left; Marky tells you when a focus round or a break ends. Every fourth break is 15 minutes. The lengths you choose are remembered.",
  "permissions": ["statusBar", "storage"]
}
*/

const pad = (n) => String(n).padStart(2, '0');
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

if (typeof Marky !== 'undefined') {
  Marky.definePlugin({
    async activate(marky) {
      const saved = (await marky.storage.get('lengths')) || {};
      let focus = Number(saved.focus) || 25;
      let rest = Number(saved.rest) || 5;
      let phase = 'focus';
      let rounds = 0;
      let left = focus * 60;
      let timer = null;

      const show = () => {
        const label = phase === 'focus' ? '🍅' : '☕';
        marky.statusBar.set(`${label} ${clock(left)}${timer ? '' : ' (paused)'}`, {
          title: 'Focus timer — start, pause or reset it from the command palette (F1)',
        });
      };
      const tick = () => {
        left -= 1;
        if (left <= 0) {
          if (phase === 'focus') {
            rounds += 1;
            phase = 'rest';
            left = (rounds % 4 === 0 ? 15 : rest) * 60;
            marky.ui.toast(`Focus round done. Take a ${left / 60}-minute break.`);
          } else {
            phase = 'focus';
            left = focus * 60;
            marky.ui.toast('Break over. Back to writing.');
          }
        }
        show();
      };
      const pause = () => { clearInterval(timer); timer = null; };

      marky.commands.register({
        id: 'toggle', title: 'Focus timer: start or pause',
        run() { if (timer) pause(); else timer = setInterval(tick, 1000); show(); },
      });
      marky.commands.register({
        id: 'reset', title: 'Focus timer: reset',
        run() { pause(); phase = 'focus'; rounds = 0; left = focus * 60; show(); },
      });
      marky.commands.register({
        id: 'lengths', title: 'Focus timer: set lengths',
        async run() {
          const answer = await marky.ui.prompt('Minutes of focus / minutes of break', `${focus} / ${rest}`);
          if (!answer) return;
          const m = /^\s*(\d{1,3})\s*[/,\s]\s*(\d{1,3})\s*$/.exec(answer);
          if (!m || +m[1] < 1 || +m[2] < 1) { marky.ui.toast('Enter two numbers, like “25 / 5”'); return; }
          focus = +m[1]; rest = +m[2];
          await marky.storage.set('lengths', { focus, rest });
          if (!timer) { phase = 'focus'; left = focus * 60; }
          show();
        },
      });
      show();
    },
  });
}
