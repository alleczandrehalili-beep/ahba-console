import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const src = js.match(/function napViewVisible\(u,gcId\)\{[^\n]*\}/);
const napViewVisible = new Function('return ' + src[0])();
const GC = 'org-ahba', SUB = 'org-sub';

test('NAP VIEW visibility: super, or GC console user granted napboard', () => {
  assert.equal(napViewVisible({ is_super: true, org_id: SUB, allowed_pages: [] }, GC), true);
  assert.equal(napViewVisible({ is_super: true }, ''), true);
  assert.equal(napViewVisible({ org_id: GC, allowed_pages: ['overview', 'napboard'] }, GC), true);
  assert.equal(napViewVisible({ org_id: GC, allowed_pages: ['overview'] }, GC), false);          // no grant
  assert.equal(napViewVisible({ org_id: SUB, allowed_pages: ['napboard'] }, GC), false);         // subcon, even if ticked
  assert.equal(napViewVisible({ org_id: null, allowed_pages: ['napboard'] }, GC), false);        // no org
  assert.equal(napViewVisible({ org_id: GC, allowed_pages: ['napboard'] }, ''), false);          // orgs not loaded yet
  assert.equal(napViewVisible({ org_id: GC, allowed_pages: 'napboard' }, GC), false);            // malformed grants
  assert.equal(napViewVisible({ org_id: GC, edit_pages: ['napboard'] }, GC), false);             // only allowed_pages counts
  assert.equal(napViewVisible(null, GC), false);
  assert.equal(napViewVisible(undefined, GC), false);
});

test('NAP VIEW is a hidden new-tab link, never a switchPage page or the landing page', () => {
  const a = html.match(/<a class="nav-item" id="napViewNav"[^>]*>/);
  assert.ok(a, 'link exists in the sidebar');
  assert.match(a[0], /target="_blank"/);
  assert.match(a[0], /rel="noopener noreferrer"/);
  assert.match(a[0], /display:none/);
  assert.ok(!/data-page=/.test(a[0]), 'no data-page');
  assert.match(js, /const NAP_BOARD_URL='https:\/\/console\.ahbadevt\.com\/nap-dashboard\.html';/);
  assert.match(js, /\$\$\('\.nav-item'\)\.forEach\(b=>\{ if\(b\.id==='napViewNav'\) return; b\.onclick=\(\)=>switchPage/);
  assert.match(js, /\$\$\('\.nav-item'\)\.forEach\(n=>\{ if\(n\.id==='napViewNav'\) return; const pg=n\.dataset\.page;/);
  assert.match(js, /allowed\.filter\(p=>p!=='photofix'&&p!=='techreset'&&p!=='napboard'\)/);
  assert.match(js, /try\{ napViewNav\(\); \}catch\(e\)\{\}   \/\/ NAP VIEW needs gcOrgId/);
});
