const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {chromium} = require('playwright');

const base = 'http://127.0.0.1:8765';
const articleUrl = base + '/2026/03/18/chiller-optimization-2026/';
const artifacts = 'test-artifacts/article';

async function openArticle(browser, width) {
  const page = await browser.newPage({viewport: {width, height: 860}, isMobile: width < 500, hasTouch: width < 500});
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const response = await page.goto(articleUrl, {waitUntil: 'load'});
  assert.equal(response.status(), 200);

  const styles = await page.locator('link[rel="stylesheet"]').getAttribute('href');
  assert.match(styles, /^\/css\/editorial\.[0-9a-f]{12}\.css$/);
  const stylesheet = await page.request.get(base + styles);
  assert.equal(stylesheet.status(), 200);
  assert.match(stylesheet.headers()['content-type'], /text\/css/);

  const layout = await page.evaluate(() => {
    const toc = document.querySelector('.journal-article-aside');
    const article = document.querySelector('.journal-prose');
    const paragraph = article.querySelector('p');
    const heading = article.querySelector('h2');
    return {
      tocBeforeArticle: Boolean(toc.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING),
      tocBackground: getComputedStyle(toc).backgroundColor,
      articleBackground: getComputedStyle(article).backgroundColor,
      paragraphGap: parseFloat(getComputedStyle(paragraph).marginBottom),
      headingGap: parseFloat(getComputedStyle(heading).marginTop),
      border: parseFloat(getComputedStyle(toc).borderTopWidth),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  assert.ok(layout.tocBeforeArticle);
  assert.notEqual(layout.tocBackground, layout.articleBackground);
  assert.ok(layout.border >= 1);
  assert.ok(layout.paragraphGap >= 12, JSON.stringify(layout));
  assert.ok(layout.headingGap >= 20, JSON.stringify(layout));
  assert.ok(layout.scrollWidth <= layout.innerWidth + 1, JSON.stringify(layout));
  return page;
}

async function checkMobile(browser, width) {
  const page = await openArticle(browser, width);
  const toc = page.locator('[data-article-toc]');
  const summary = toc.locator('summary');
  const article = page.locator('.journal-prose');
  assert.equal(await summary.innerText(), '本页目录');
  assert.equal(await toc.evaluate(element => element.open), false);
  const folded = await toc.boundingBox();
  const body = await article.boundingBox();
  assert.ok(folded.y + folded.height < body.y, {folded, body});
  if (width === 390) await page.screenshot({path: artifacts + '/mobile-article.png'});

  await summary.click();
  assert.equal(await toc.evaluate(element => element.open), true);
  assert.equal(await toc.locator('.journal-toc').evaluate(element => getComputedStyle(element).listStyleType), 'none');
  if (width === 390) await page.screenshot({path: artifacts + '/mobile-directory-open.png'});
  const link = toc.locator('a[href^="#"]').first();
  const target = decodeURIComponent((await link.getAttribute('href')).slice(1));
  await link.click();
  assert.equal(await toc.evaluate(element => element.open), false);
  await page.waitForFunction(id => decodeURIComponent(location.hash.slice(1)) === id && document.getElementById(id), target);
  console.log(`${width}px mobile: separate, collapsible directory and article navigation verified`);
  await page.close();
}

(async () => {
  await mkdir(artifacts, {recursive: true});
  const browser = await chromium.launch();
  try {
    for (const width of [360, 390, 430]) await checkMobile(browser, width);

    const page = await openArticle(browser, 1280);
    const toc = page.locator('[data-article-toc]');
    const article = page.locator('.journal-prose');
    assert.equal(await toc.evaluate(element => element.open), true);
    const side = await toc.boundingBox();
    const body = await article.boundingBox();
    assert.ok(side.x > body.x + body.width, {side, body});
    assert.equal(await page.locator('.journal-article-aside').evaluate(element => getComputedStyle(element).position), 'sticky');
    await page.screenshot({path: artifacts + '/desktop-article.png'});
    console.log('1280px desktop: sticky directory sidebar and article card verified');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
