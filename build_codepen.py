#!/usr/bin/env python3
"""Merge index.html + app.html + all CSS + JS into one file for CodePen."""
import re, os

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(BASE, path), encoding='utf-8') as f:
        return f.read()

landing_html = read('index.html')
app_html     = read('app.html')
landing_css  = read('styles/landing.css')
app_css      = read('styles/app.css')
landing_js   = read('js/landing.js')
app_js       = read('js/app.js')

# Extract <body> content
def body(html):
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    return m.group(1).strip() if m else html

landing_body = body(landing_html)
app_body     = body(app_html)

# Remove <script src=...> from landing body (will inline all JS)
landing_body = re.sub(r'<script src="[^"]*landing\.js"[^>]*></script>', '', landing_body)

# Remove session-guard inline script from app body
app_body = re.sub(r'<script>\s*\(function\(\)\{[^}]*user\?\.uid[^<]*\}\)\(\);\s*</script>', '', app_body, flags=re.DOTALL)

# Remove <script src=...app.js...> from app body
app_body = re.sub(r'<script src="[^"]*app\.js"[^>]*></script>', '', app_body)

# Fix navigation hrefs
landing_body = landing_body.replace("href='app.html'", "href='#' onclick=\"enterApp();return false;\"")
landing_body = landing_body.replace('href="app.html"', 'href="#" onclick="enterApp();return false;"')
app_body     = app_body.replace("href='index.html'", "href='#' onclick=\"exitApp();return false;\"")
app_body     = app_body.replace('href="index.html"', 'href="#" onclick="exitApp();return false;"')
app_js       = app_js.replace("window.location.href = 'index.html'", "exitApp()")
app_js       = app_js.replace("window.location.href = 'app.html'",  "enterApp()")
landing_js   = landing_js.replace("window.location.href = 'app.html'",  "enterApp()")

# Strip display:flex from app body tag if present
app_css = re.sub(r'(body\s*\{[^}]*?)display\s*:\s*flex\s*;?', r'\1', app_css)

# Remove duplicate STORE_KEY declaration from landing_js (app_js declares it as const)
# landing_js already has the typeof guard, so it's fine — no extra work needed

combined = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FinanceOS — Gestão Financeira Inteligente</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <style>
/* ══ LANDING CSS ══ */
{landing_css}

/* ══ APP CSS ══ */
{app_css}

/* ══ VIEW SWITCHING ══ */
#appView   {{ display: none; }}
#landingView {{ display: block; }}
  </style>
</head>
<body>

<div id="landingView">
{landing_body}
</div>

<div id="appView">
{app_body}
</div>

<script>
/* ══ MERGE HELPERS ══ */
function enterApp() {{
  document.getElementById('landingView').style.display = 'none';
  document.getElementById('appView').style.display     = 'block';
  if (typeof initApp === 'function') initApp();
}}
function exitApp() {{
  document.getElementById('appView').style.display     = 'none';
  document.getElementById('landingView').style.display = 'block';
}}

/* ══ APP JS ══ */
{app_js}

/* ══ LANDING JS ══ */
{landing_js}
</script>
</body>
</html>
"""

out = os.path.join(BASE, 'financeos-codepen.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(combined)

size_kb = len(combined.encode('utf-8')) / 1024
print(f'Built {out}  ({size_kb:.1f} KB, {len(combined.splitlines())} lines)')
