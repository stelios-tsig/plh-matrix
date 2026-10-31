const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/#/progress'); await p.waitForTimeout(1200);
  const res = await p.evaluate(() => {
    const out = []; const div = document.createElement('div');
    for (const it of Object.values(PLH.IDX.item)) {
      try {
        PLH.renderQuestion(it, div, { exam: false });
        const html = div.innerHTML;
        if (/@@B\d/.test(html)) out.push([it.id, 'leftover blank']);
        if (it.type === 'fill' && div.querySelectorAll('input.blank').length !== it.b.length) out.push([it.id, 'blank count ' + div.querySelectorAll('input.blank').length + '/' + it.b.length]);
        if (it.type === 'mcq' && div.querySelectorAll('.opt').length !== it.o.length) out.push([it.id, 'opts']);
        if (/\{\{|\}\}/.test(div.textContent)) out.push([it.id, 'braces in text']);
        // self-check: correct answer accepted
        if (it.type === 'short' && !PLH.matches(it.a.find(x=>!x.startsWith('re:')), it.a)) out.push([it.id, 'self-match']);
        if (it.type === 'fill') it.b.forEach((alts,i)=>{ if(!PLH.matches(alts[0], alts)) out.push([it.id,'fill self '+i]); });
      } catch (e) { out.push([it.id, 'ERR ' + e.message]); }
    }
    return out;
  });
  console.log(JSON.stringify(res, null, 0)); console.log('pageerrors', errs);
  await b.close();
})();
