// Horizontal overflow audit at 320/375/390/430/768/1280 with feedback UI in each state.
const { URL, launch } = require('./lib');
const widths = [320, 375, 390, 430, 768, 1280];
(async () => {
  const b = await launch(); let bad = 0;
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: w < 800, isMobile: w < 800 });
    const page = await ctx.newPage(); await page.goto(URL);
    const measure = async label => {
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('body *')].filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(n).position !== 'fixed' && !n.closest('pre,.scroll,[style*="overflow"]'); }).slice(0, 4).map(n => (n.id ? '#' + n.id : n.tagName.toLowerCase() + '.' + String(n.className).split(' ')[0]) + ' r=' + Math.round(n.getBoundingClientRect().right));
        return { sw: document.documentElement.scrollWidth, vw, offenders };
      });
      const ok = r.sw <= r.vw; if (!ok) bad++;
      console.log(ok ? '✓' : '✗', w + 'px', label, 'scrollWidth=' + r.sw, r.offenders.length ? 'offenders: ' + r.offenders.join(', ') : '');
    };
    await measure('app');
    await page.click('#btu-feedback-launch'); await page.click('text=Mis reportes'); await measure('feedback list');
    await page.keyboard.press('Escape'); await ctx.close();
  }
  await b.close(); process.exitCode = bad ? 1 : 0;
})();
