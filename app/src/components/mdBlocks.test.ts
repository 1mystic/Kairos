import { describe, expect, it } from 'vitest';
import { renderWithBlocks } from './mdBlocks';

// identity-ish inline renderer: wraps in the same paragraph div core produces, escapes nothing (mdBlocks escapes code itself)
const rt = (md: string) => `<div class="kc-p">${md}</div>`;

describe('renderWithBlocks tables', () => {
  it('keeps pipes inside math, code spans and escaped pipes within one cell', () => {
    const html = renderWithBlocks('| a | b |\n|---|---|\n| $|x|$ | `p | q` |\n| 1 \\| 2 | 3 |', rt);
    expect(html).toContain('<td>$|x|$</td><td>`p | q`</td>');
    expect(html).toContain('<td>1 | 2</td><td>3</td>');
  });

  it('widens the table instead of dropping cells of ragged rows, and pads short rows', () => {
    const html = renderWithBlocks('| a | b |\n|---|---|\n| 1 | 2 | 3 |\n| 4 |', rt);
    expect(html.match(/<th>/g)).toHaveLength(3);
    expect(html).toContain('<td>3</td>');
    expect(html).toContain('<td>4</td><td></td><td></td>');
  });

  it('escapes fenced code and leaves pipes in code untouched', () => {
    const html = renderWithBlocks('x\n```python\nif a | b: <b>\n```\ny', rt);
    expect(html).toContain('<pre class="kc-code"><code>if a | b: &lt;b&gt;</code></pre>');
  });
});
