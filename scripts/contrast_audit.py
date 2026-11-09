#!/usr/bin/env python3
"""WCAG 2.x contrast audit of brand/tokens.css (+ on-primary from index.css). Pure math, no deps."""
import re, sys, json

def parse(css):
    light = dict(re.findall(r'--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})', css.split('[data-theme="dark"]')[0]))
    dark_part = css.split('[data-theme="dark"]')[1]
    dark = dict(light); dark.update(dict(re.findall(r'--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})', dark_part)))
    return light, dark

def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(c): c /= 255; return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
def lum(h): r, g, b = (lin(x) for x in rgb(h)); return 0.2126*r + 0.7152*g + 0.0722*b
def cr(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb); return (hi+0.05)/(lo+0.05)
def mix(a, b, pct):  # color-mix(in srgb, a, b pct%)
    ra, rb = rgb(a), rgb(b); return '#%02X%02X%02X' % tuple(round(x*(1-pct/100)+y*pct/100) for x, y in zip(ra, rb))

def pairs(t, dark):
    on_primary = t['paper'] if dark else t['surface']
    tint_hover = mix(t['surface-3'], t['ink'], 5); tint_active = mix(t['surface-3'], t['ink'], 8)
    bgs = ['paper', 'surface', 'surface-2', 'surface-3', 'primary-50', 'accent-50', 'good-50', 'bad-50']
    P = []
    for bg in bgs:
        P.append(('text', 'ink', bg, t['ink'], t[bg])); P.append(('text', 'slate', bg, t['slate'], t[bg]))
    for bg in ['paper', 'surface', 'surface-2', 'primary-50']:
        P.append(('text', 'primary(link)', bg, t['primary'], t[bg]))
    P += [('text', 'primary', 'surface-3', t['primary'], t['surface-3']),
          ('text', 'accent-ink', 'accent-50', t['accent-ink'], t['accent-50']),
          ('text', 'accent-ink', 'surface', t['accent-ink'], t['surface']),
          ('text', 'accent-ink', 'paper', t['accent-ink'], t['paper']),
          ('text', 'accent-ink', 'surface-2', t['accent-ink'], t['surface-2']),
          ('text', 'good-ink', 'good-50', t['good-ink'], t['good-50']),
          ('text', 'good-ink', 'surface', t['good-ink'], t['surface']),
          ('text', 'good-ink', 'surface-2', t['good-ink'], t['surface-2']),
          ('text', 'bad-ink', 'bad-50', t['bad-ink'], t['bad-50']),
          ('text', 'bad-ink', 'surface', t['bad-ink'], t['surface']),
          ('text', 'bad-ink', 'surface-2', t['bad-ink'], t['surface-2']),
          ('text', 'on-primary', 'primary', on_primary, t['primary']),
          ('text', 'on-primary', 'primary-hover', on_primary, t['primary-hover']),
          ('text', 'on-primary', 'primary-active', on_primary, t['primary-active']),
          ('text', 'on-good', 'good', t['on-good'], t['good']),
          ('text', 'on-bad', 'bad', t['on-bad'], t['bad']),
          ('text', 'ink', 'tint-hover', t['ink'], tint_hover),
          ('text', 'slate', 'tint-hover', t['slate'], tint_hover),
          ('text', 'ink', 'tint-active', t['ink'], tint_active),
          ('text', 'primary', 'tint-hover', t['primary'], tint_hover),
          ('ui', 'primary fill', 'surface-2', t['primary'], t['surface-2']),
          ('ui', 'primary fill', 'surface', t['primary'], t['surface']),
          ('ui', 'primary fill', 'paper', t['primary'], t['paper']),
          ('ui', 'accent fill', 'surface-2', t['accent'], t['surface-2']),
          ('ui', 'accent fill', 'paper', t['accent'], t['paper']),
          ('ui', 'good fill', 'surface-2', t['good'], t['surface-2']),
          ('ui', 'bad fill', 'surface-2', t['bad'], t['surface-2']),
          ('ui', 'surface-3 vs surface (field/track)', 'surface', t['surface-3'], t['surface']),
          ('ui', 'surface-2 vs paper (card edge)', 'paper', t['surface-2'], t['paper']),
          ('ui', 'surface-3 vs surface-2 (field in card)', 'surface-2', t['surface-3'], t['surface-2'])]
    return P

def run(path, verbose=True):
    css = open(path).read()
    light, dark = parse(css)
    fails = []
    for name, t, d in (('LIGHT', light, False), ('DARK', dark, True)):
        if verbose: print(f'\n=== {name} ===')
        for kind, fg, bg, f, b in pairs(t, d):
            r = cr(f, b); need = 4.5 if kind == 'text' else 3.0
            ok = r >= need
            if not ok: fails.append((name, kind, fg, bg, round(r, 2), need))
            if verbose: print(f"{'OK ' if ok else 'FAIL'} {kind:4} {fg:34} on {bg:14} {r:5.2f}  (need {need})")
    return fails

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/home/mystic1/projects/kairos/brand/tokens.css'
    fails = run(path, verbose='-q' not in sys.argv)
    print(f'\nFAILURES: {len(fails)}')
    for f in fails: print('  ', f)
