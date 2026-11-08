import { describe, it, expect } from 'vitest';
import { splitContent, renderContentHtml } from './markdown';

const id = '0123456789abcdef';
const imageHtml = (i: string, alt: string) => `<img data-id="${i}" alt="${alt}">`;
const r = (md: string) => renderContentHtml(md, { imageHtml });

describe('splitContent', () => {
  it('orders text, math and images', () => {
    expect(splitContent(`a $x$ b ![fig](img:${id}) c $$y$$`)).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'math', tex: 'x', display: false },
      { kind: 'text', text: ' b ' },
      { kind: 'image', id, alt: 'fig' },
      { kind: 'text', text: ' c ' },
      { kind: 'math', tex: 'y', display: true },
    ]);
  });
  it('leaves other image syntaxes as text and handles empty input', () => {
    expect(splitContent('![x](http://a/b.png)')).toEqual([{ kind: 'text', text: '![x](http://a/b.png)' }]);
    expect(splitContent('')).toEqual([]);
    expect(splitContent(`![a](img:${id})![b](img:${id})`)).toHaveLength(2);
  });
});

describe('renderContentHtml', () => {
  it('escapes raw html', () => {
    const h = r('<script>alert(1)</script> <img src=x onerror=1>');
    expect(h).not.toContain('<script');
    expect(h).not.toContain('<img src');
    expect(h).toContain('&lt;script&gt;');
  });
  it('renders paragraphs and line breaks', () => {
    expect(r('a\nb\n\nc')).toBe('<div class="kc-p">a<br>b</div><div class="kc-p">c</div>');
  });
  it('renders bold, italic, code', () => {
    expect(r('**b** *i* `c*d*`')).toBe(
      '<div class="kc-p"><strong>b</strong> <em>i</em> <code>c*d*</code></div>',
    );
    expect(r('2 * 3 * 4')).toBe('<div class="kc-p">2 * 3 * 4</div>');
  });
  it('renders lists', () => {
    expect(r('intro\n- one\n- **two**\n\nafter')).toBe(
      '<div class="kc-p">intro</div><ul><li>one</li><li><strong>two</strong></li></ul><div class="kc-p">after</div>',
    );
  });
  it('renders math and images; emphasis spans math safely', () => {
    const h = r(`**bold $a*b$ text** ![alt "q"](img:${id})`);
    expect(h).toContain('<strong>bold ');
    expect(h).toContain('katex');
    expect(h).toContain(`data-id="${id}"`);
    expect(h).not.toContain('<em>');
  });
  it('renders display math containing blank lines as one block and chemistry', () => {
    const h = r('$$\\ce{A -> B}\n\n+ c$$');
    expect(h).toContain('katex-display');
    expect(h.match(/kc-p/g)).toHaveLength(1);
  });
  it('ignores private-use placeholder chars in input', () => {
    expect(r('x0y')).toBe('<div class="kc-p">x0y</div>');
  });
  it('handles CRLF', () => {
    expect(r('a\r\n\r\nb')).toBe('<div class="kc-p">a</div><div class="kc-p">b</div>');
  });
});
