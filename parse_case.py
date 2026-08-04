import urllib.request
import re
from html import unescape

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def parse_case_detail(html, case_code):
    # Case ID
    case_id_match = re.search(r'<div class="p-case__detailId[^"]*">\s*([A-Z0-9\-]+)\s*</div>', html)
    case_id = case_id_match.group(1) if case_id_match else case_code
    
    # Update date
    date_match = re.search(r'<time datetime="([^"]+)">', html)
    update_date = date_match.group(1) if date_match else ""
    
    # Categories
    categories = re.findall(r'/caselist/cat/[^/]+/">([^<]+)</a>', html)
    categories = [unescape(c.strip()) for c in categories]
    
    # Tags
    tags_html = re.findall(r'<li class="p-case__detailTagListItem"><a class="c-link" href="https://www\.astop\.co\.jp/zone/en/caselist/tag/[^/]+/">([^<]+)</a></li>', html)
    tags = [unescape(t.strip()) for t in tags_html]
    
    # Title
    title_match = re.search(r'<h3 class="p-case__detailTitle[^"]*">([^<]+)</h3>', html)
    title = unescape(title_match.group(1).strip()) if title_match else ""
    
    # Caption
    caption_match = re.search(r'<p class="p-case__detailCaption[^"]*">([^<]+)</p>', html)
    caption = unescape(caption_match.group(1).strip()) if caption_match else ""
    
    # Lineup images
    # <li class="p-case__detailLineupListItem... data-src="IMAGE_URL"
    images = re.findall(r'class="p-case__detailLineupImage">\s*<img[^>]+data-src="([^"]+)"', html)
    if not images:
        # Fallback if lazyload data-src isn't found
        images = re.findall(r'class="p-case__detailLineupImage">\s*<img[^>]+src="([^"]+)"', html)
    
    # Extract number and letter
    num_match = re.search(r'(\d+)', case_id)
    number = int(num_match.group(1)) if num_match else 0
    letter_match = re.search(r'([A-Z])', case_id)
    letter = letter_match.group(1) if letter_match else ""

    return {
        "id": case_id,
        "code": case_code,
        "number": number,
        "letter": letter,
        "date": update_date,
        "categories": categories,
        "tags": tags,
        "title": title,
        "caption": caption,
        "images": images
    }

if __name__ == '__main__':
    url = "https://www.astop.co.jp/zone/en/caselist/W86.html"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        result = parse_case_detail(html, "W86")
        import json
        print(json.dumps(result, indent=2))
