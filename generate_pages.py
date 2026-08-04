import json
import os
import html
import re

SITE_BASE_URL = "https://sin3point14.github.io/a-stop-scraper"

def escape(text):
    return html.escape(text or "")

def generate_shelf_html(case_data):
    case_id = case_data.get('id', '')
    case_code = case_data.get('code', case_id.replace('-', ''))
    tags = case_data.get('tags', [])
    images = case_data.get('images', [])
    rep_image = images[0] if images else "https://www.astop.co.jp/zone/wp-content/themes/astop_zone/dest/assets/image/ogpImg.jpg"
    astop_url = case_data.get('url', f"https://www.astop.co.jp/zone/en/caselist/{case_code}.html")
    
    tags_str = ", ".join(tags) if tags else "Akihabara Collectibles"
    page_title = f"ASTOP Shelf {case_id} — {tags_str}"
    meta_desc = f"Browse all {len(images)} photos from A-STOP rental showcase shelf {case_id}. Series: {tags_str}."
    canonical_url = f"{SITE_BASE_URL}/cases/{case_code}.html"

    # Build Tags Badges
    tags_html = "".join([f'<span class="case-tag-badge">{escape(t)}</span>' for t in tags])

    # Build Lineup Images Grid
    images_html = ""
    for idx, img in enumerate(images):
        images_html += f'''
        <div class="lineup-item">
          <img src="{escape(img)}" alt="Shelf {escape(case_id)} photo {idx+1}" loading="lazy" />
          <span class="lineup-index-badge">{idx+1}/{len(images)}</span>
        </div>
        '''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>{escape(page_title)}</title>
  <meta name="title" content="{escape(page_title)}">
  <meta name="description" content="{escape(meta_desc)}">
  <link rel="canonical" href="{escape(canonical_url)}">

  <!-- Open Graph / Discord Link Preview Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="{escape(canonical_url)}">
  <meta property="og:title" content="A-STOP Shelf {escape(case_id)} ({len(images)} Photos)">
  <meta property="og:description" content="Series Tags: {escape(tags_str)}">
  <meta property="og:image" content="{escape(rep_image)}">
  <meta property="og:site_name" content="A-STOP Showcase Browser">

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="{escape(canonical_url)}">
  <meta name="twitter:title" content="A-STOP Shelf {escape(case_id)} ({len(images)} Photos)">
  <meta name="twitter:description" content="Series Tags: {escape(tags_str)}">
  <meta name="twitter:image" content="{escape(rep_image)}">

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="../style.css">

  <style>
    body {{
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      background: var(--bg-primary);
    }}
    .single-case-container {{
      background: var(--bg-glass-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }}
    .nav-bar-top {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }}
    .toast-copy {{
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--accent-cyan);
      color: #000;
      font-weight: 700;
      padding: 0.6rem 1.2rem;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 1000;
    }}
    .toast-copy.show {{
      opacity: 1;
    }}
  </style>
</head>
<body>
  <div class="nav-bar-top">
    <a href="../index.html#case-{escape(case_id)}" class="btn btn-outline">
      <i class="fa-solid fa-arrow-left"></i> Browse All Shelves
    </a>
    <button id="share-btn" class="btn btn-primary">
      <i class="fa-solid fa-share-nodes"></i> Copy Share Link
    </button>
  </div>

  <main class="single-case-container">
    <div class="case-row-header">
      <div class="case-info-main">
        <div class="case-badge">{escape(case_id)}</div>
        <span class="case-number-tag">Shelf #{case_data.get('number', '')}</span>
        <div class="case-tags-inline">
          {tags_html}
        </div>
      </div>

      <div class="case-meta-right">
        {f'<span class="case-date"><i class="fa-regular fa-clock"></i> {escape(case_data.get("date", ""))}</span>' if case_data.get("date") else ''}
        <a href="{escape(astop_url)}" target="_blank" rel="noopener" class="astop-link-btn">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> ASTOP Page
        </a>
      </div>
    </div>

    <div class="case-lineup-container">
      {images_html}
    </div>
  </main>

  <div id="toast" class="toast-copy"><i class="fa-solid fa-check"></i> Direct Share Link Copied!</div>

  <script>
    function copyText(text) {{
      if (navigator.clipboard && navigator.clipboard.writeText) {{
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy(text));
      }} else {{
        fallbackCopy(text);
      }}
    }}
    function fallbackCopy(text) {{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {{ document.execCommand('copy'); showToast(); }} catch (e) {{}}
      document.body.removeChild(ta);
    }}
    function showToast() {{
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }}
    document.getElementById('share-btn').addEventListener('click', () => {{
      const shareUrl = window.location.href;
      if (navigator.share) {{
        navigator.share({{
          title: 'ASTOP Shelf {escape(case_id)}',
          text: 'Check out ASTOP figurine shelf {escape(case_id)} ({escape(tags_str)})',
          url: shareUrl
        }}).catch(() => copyText(shareUrl));
      }} else {{
        copyText(shareUrl);
      }}
    }});
  </script>
</body>
</html>
'''

def main():
    if not os.path.exists("cases_data.json"):
        print("Error: cases_data.json not found!")
        return

    with open("cases_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    cases = data.get("cases", [])
    os.makedirs("cases", exist_ok=True)

    print(f"Generating {len(cases)} static shelf HTML pages in cases/...")

    for case in cases:
        code = case.get('code') or case.get('id', '').replace('-', '')
        if not code:
            continue
        file_path = os.path.join("cases", f"{code}.html")
        html_content = generate_shelf_html(case)
        with open(file_path, "w", encoding="utf-8") as out_file:
            out_file.write(html_content)

    print(f"Successfully generated {len(cases)} shelf pages in cases/ folder!")

if __name__ == '__main__':
    main()
