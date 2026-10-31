const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const out = process.argv[2] || '/tmp/claude-0/-home-claude/0706de4d-2b3d-544a-a486-58a92f371e97/scratchpad/shots';
  require('fs').mkdirSync(out, { recursive: true });
  const go = async (h, name, act) => { await p.goto('http://localhost:8765/' + h); await p.waitForTimeout(700); if (act) await act(); await p.screenshot({ path: `${out}/${name}.png` }); };
  await go('#/', '01-home');
  await go('#/lesson/p10-signed/theory', '02-theory');
  await go('#/lesson/p10-signed/quiz', '03-teach');
  await p.click('#toAsk'); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/04-q.png` });
  // answer something
  const opt = await p.$('.opt'); if (opt) { await opt.click(); } else { const inp = await p.$('input.ans, input.blank'); if (inp) await inp.fill('123'); }
  const chk = await p.$('#chk'); if (chk) await chk.click();
  await p.waitForTimeout(300); await p.screenshot({ path: `${out}/05-fb.png`, fullPage: false });
  await go('#/session/gen/sched', '06-gen', async () => { const t = await p.$('#toAsk'); if (t) await t.click(); await p.waitForTimeout(200); });
  await go('#/progress', '07-progress');
  await go('#/settings', '08-settings');
  console.log('errors:', errs);
  await b.close();
})();
