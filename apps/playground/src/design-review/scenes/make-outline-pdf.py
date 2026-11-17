#!/usr/bin/env python3
"""Writes compact-document-viewer-outline.pdf: 3 pages of Helvetica text, a nested outline (2 levels), fixed metadata.
Deterministic (no timestamps from the clock). Usage: python3 -I make-outline-pdf.py [out.pdf]"""
import sys
out = sys.argv[1] if len(sys.argv) > 1 else 'compact-document-viewer-outline.pdf'
pages = [
    ('Handbook', ['Chapter 1: Overview', 'The overview explains the budget process.', 'Section 1.1 covers the planning calendar.']),
    ('Details', ['Chapter 2: Details', 'Detailed figures follow the budget order.', 'Section 2.1 lists every cost centre.']),
    ('Appendix', ['Chapter 3: Appendix', 'Glossary of terms and abbreviations.', 'Nothing else to see here.']),
]
objs = {}
def content(title, lines):
    parts = [f'BT /F1 26 Tf 56 760 Td ({title}) Tj ET']
    y = 716
    for line in lines:
        parts.append(f'BT /F1 14 Tf 56 {y} Td ({line}) Tj ET')
        y -= 26
    parts.append('0.85 0.88 0.93 rg 56 380 483 200 re f')
    return '\n'.join(parts)
# object numbering: 1 font, 2 pages, 3 catalog, 4 info, 5.. outlines, then page + content pairs
font, pages_obj, catalog, info = 1, 2, 3, 4
outline_root = 5
items = [  # (title, page index, parent key)
    ('Chapter 1: Overview', 0, None), ('Section 1.1 Planning calendar', 0, 0),
    ('Chapter 2: Details', 1, None), ('Section 2.1 Cost centres', 1, 2),
    ('Chapter 3: Appendix', 2, None),
]
item_obj = [outline_root + 1 + i for i in range(len(items))]
page_base = outline_root + 1 + len(items)
page_obj = [page_base + 2 * i for i in range(len(pages))]
cont_obj = [page_base + 2 * i + 1 for i in range(len(pages))]
objs[font] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
objs[pages_obj] = '<< /Type /Pages /Kids [' + ' '.join(f'{n} 0 R' for n in page_obj) + f'] /Count {len(pages)} >>'
objs[catalog] = f'<< /Type /Catalog /Pages {pages_obj} 0 R /Outlines {outline_root} 0 R /PageMode /UseOutlines >>'
objs[info] = '<< /Title (Compact outline fixture) /Author (Cocoar) /Producer (cocoar visual fixture) /CreationDate (D:20261115000000Z) >>'
tops = [i for i, it in enumerate(items) if it[2] is None]
objs[outline_root] = f'<< /Type /Outlines /First {item_obj[tops[0]]} 0 R /Last {item_obj[tops[-1]]} 0 R /Count {len(items)} >>'
for i, (title, pg, parent) in enumerate(items):
    d = f'/Title ({title}) /Dest [{page_obj[pg]} 0 R /Fit] '
    if parent is None:
        d += f'/Parent {outline_root} 0 R '
        pos = tops.index(i)
        if pos > 0: d += f'/Prev {item_obj[tops[pos-1]]} 0 R '
        if pos < len(tops) - 1: d += f'/Next {item_obj[tops[pos+1]]} 0 R '
        kids = [k for k, it in enumerate(items) if it[2] == i]
        if kids: d += f'/First {item_obj[kids[0]]} 0 R /Last {item_obj[kids[-1]]} 0 R /Count {len(kids)} '
    else:
        d += f'/Parent {item_obj[parent]} 0 R '
    objs[item_obj[i]] = '<< ' + d + '>>'
for i, (title, lines) in enumerate(pages):
    body = content(title, lines)
    objs[page_obj[i]] = f'<< /Type /Page /Parent {pages_obj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font} 0 R >> >> /Contents {cont_obj[i]} 0 R >>'
    objs[cont_obj[i]] = f'<< /Length {len(body)} >>\nstream\n{body}\nendstream'
buf = '%PDF-1.4\n'
offsets = {}
for n in sorted(objs):
    offsets[n] = len(buf.encode('latin-1'))
    buf += f'{n} 0 obj\n{objs[n]}\nendobj\n'
xref = len(buf.encode('latin-1'))
size = max(objs) + 1
buf += f'xref\n0 {size}\n0000000000 65535 f \n'
for n in range(1, size):
    buf += f'{offsets[n]:010d} 00000 n \n'
buf += f'trailer\n<< /Size {size} /Root {catalog} 0 R /Info {info} 0 R >>\nstartxref\n{xref}\n%%EOF\n'
open(out, 'wb').write(buf.encode('latin-1'))
print('wrote', out, len(buf))
