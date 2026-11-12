#!/usr/bin/env bash
# Builds docs/submission/SkyStop-Assignment2-DRAFT.pdf from docs/SUBMISSION_PDF_CONTENT.md and docs/screenshots/*.png.
# Needs: python3 with `pip install markdown`, and Playwright's Chromium (see tests/e2e). Review the result before uploading.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/submission
python3 - <<'PY'
import markdown, pathlib
md = pathlib.Path('docs/SUBMISSION_PDF_CONTENT.md').read_text()
import re
body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
# keep each figure caption on the same page as its image
body = re.sub(r'(<p><strong>Figure[^\n]*</strong></p>\s*<p><img[^>]*></p>)', r'<div class="fig">\1</div>', body)
css = """
@page { size: A4; margin: 16mm 14mm; }
body { font: 10.5pt/1.45 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #202124; }
h1 { font-size: 20pt; } h2, h3 { break-after: avoid; page-break-after: avoid; } h2 { font-size: 14pt; margin-top: 18pt; border-bottom: 1px solid #ddd; padding-bottom: 3pt; } h3 { font-size: 11.5pt; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 8.8pt; page-break-inside: avoid; }
th, td { border: 1px solid #ccc; padding: 3pt 5pt; text-align: left; vertical-align: top; } th { background: #f1f3f4; }
code { font-size: 8.6pt; background: #f4f4f4; padding: 0 2px; word-break: break-word; }
pre { background: #f4f4f4; padding: 6pt; font-size: 8pt; white-space: pre-wrap; }
.fig { break-inside: avoid; page-break-inside: avoid; }
img { display: block; max-height: 150mm; max-width: 62mm; margin: 4pt 0 10pt; border: 1px solid #ddd; border-radius: 6px; }
p strong:first-child { page-break-after: avoid; }
"""
pathlib.Path('docs/submission/index.html').write_text(f"<!doctype html><meta charset='utf-8'><title>SkyStop Assignment 2 (draft)</title><base href='../'><style>{css}</style>{body}")
PY
node - <<'JS'
const { createRequire } = require('node:module');
const { chromium } = createRequire(process.cwd() + '/package.json')('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/docs/submission/index.html');
  await p.waitForLoadState('load');
  await p.pdf({ path: 'docs/submission/SkyStop-Assignment2-DRAFT.pdf', format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }, displayHeaderFooter: true, footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#777">SkyStop — Assignment 2 (draft) · <span class="pageNumber"></span>/<span class="totalPages"></span></div>', headerTemplate: '<div></div>' });
  await b.close();
})();
JS
echo "wrote docs/submission/SkyStop-Assignment2-DRAFT.pdf"
