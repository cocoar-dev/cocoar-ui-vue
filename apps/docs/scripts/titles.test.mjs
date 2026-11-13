import { test } from 'node:test';
import assert from 'node:assert/strict';

import { headingTitle, plainHeadingTitle } from './titles.mjs';

test('headingTitle drops badge tags and keeps inline code', () => {
  assert.equal(
    headingTitle('`<CoarPageBuilder>` <Badge type="warning" text="Preview" />'),
    '`<CoarPageBuilder>`',
  );
  assert.equal(headingTitle('Drag & Drop'), 'Drag & Drop');
});

test('plainHeadingTitle drops backticks and decodes entities', () => {
  assert.equal(
    plainHeadingTitle('`<CoarCalendar>` — Composer <Badge type="warning" text="Preview" />'),
    '<CoarCalendar> — Composer',
  );
  assert.equal(plainHeadingTitle('AssetStore&lt;T&gt; contract'), 'AssetStore<T> contract');
  assert.equal(plainHeadingTitle('&quot;A&quot; &#39;B&#39; &amp; C'), `"A" 'B' & C`);
  // Decoded once: &amp;lt; is the text "&lt;", not "<".
  assert.equal(plainHeadingTitle('&amp;lt;'), '&lt;');
});
