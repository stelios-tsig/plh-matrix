const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#/'); await p.waitForTimeout(800);
  const lid = await p.evaluate(() => Object.keys(PLH.IDX.lesson)[0]);
  await p.goto(`http://localhost:8765/#/lesson/${lid}/quiz`); await p.waitForTimeout(400);
  async function answerOne() {
    if (await p.$('#toAsk')) await p.click('#toAsk');
    // απάντησε σωστά μέσω του ίδιου του item
    await p.evaluate(() => {
      const it = PLH.Session.cur(), q = document.querySelector('#q');
      if (it.type === 'tf' || it.type === 'mcq') { const bs = q.querySelectorAll('.opt'); const idx = it.type === 'tf' ? (it.a ? 0 : 1) : it.a; bs[idx].click(); }
      else if (it.type === 'fill') { const ins = q.querySelectorAll('input'); PLH.blanksOf(it).forEach((b, i) => ins[i].value = b[0]); }
      else { const v = (Array.isArray(it.a) ? it.a : [it.a]).find(x => !String(x).startsWith('re:')); q.querySelector('input,textarea').value = v; }
    });
    if (await p.$('#chk')) await p.click('#chk');
    await p.click('#nxt');
  }
  for (let i = 0; i < 3; i++) await answerOne();
  const before = await p.evaluate(() => PLH.Session.active.idx);
  await p.goto('http://localhost:8765/#/'); await p.waitForTimeout(300);
  const tile = await p.textContent('.tile');
  await p.reload(); await p.waitForTimeout(600);  // κλείσιμο/άνοιγμα εφαρμογής
  await p.goto(`http://localhost:8765/#/lesson/${lid}`); await p.waitForTimeout(300);
  const lessonTile = await p.$eval('.tile', e => e.textContent).catch(() => null);
  await p.goto(`http://localhost:8765/#/lesson/${lid}/quiz`); await p.waitForTimeout(400);
  const after = await p.evaluate(() => [PLH.Session.active.idx, PLH.Session.active.res.length]);
  const banner = await p.$eval('.resume', e => e.textContent).catch(() => null);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/0706de4d-2b3d-544a-a486-58a92f371e97/scratchpad/resume.png' });
  await p.click('#restart'); await p.waitForTimeout(300);
  const restarted = await p.evaluate(() => [PLH.Session.active.idx, !!PLH.S.saved[location.hash]]);
  console.log(JSON.stringify({ before, tile: tile.trim().slice(0, 80), lessonTile: lessonTile && lessonTile.trim().slice(0, 60), after, banner: banner && banner.trim(), restarted, errs }, null, 1));
  await b.close();
})();
