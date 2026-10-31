const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(800);
 console.log(await p.evaluate(() => [PLH.matches('1, 3, 9',['1 3 9']), PLH.matches('[3,6,2,8]',['3,6,2,8']), PLH.matches('4,67',['4.67']), PLH.matches('4 5',['4.5']), PLH.matches('cdf',['CDF','re:x']), PLH.matches('  F6 ',['F6']), PLH.matches('n % 2 == 0',['n%2==0'])]));
 await b.close(); })();
