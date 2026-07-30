import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def replacer(m):
    path = m.group(1) + '.html'
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

html = re.sub(r"<\?!=\s*include_\('([^']+)'\)\s*\?>", replacer, html)

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Build complete.')
