import urllib.request
import re
import json
import time
from html import unescape
from concurrent.futures import ThreadPoolExecutor, as_completed

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

BLOCK_TAXONOMIES = [
    529, 583, 737, 838, 825, 2130, 614, 1037, 766, 978, 756, 667, 804, 1006, 1180, 915
]

def fetch_url(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return None

def discover_case_urls():
    all_case_urls = set()
    
    # 1. Paginate through main caselist
    page = 1
    while page <= 100:
        url = f"https://www.astop.co.jp/zone/en/caselist/page/{page}/" if page > 1 else "https://www.astop.co.jp/zone/en/caselist/"
        html = fetch_url(url)
        if not html:
            break
        
        matches = re.findall(r'href=["\'](https://www\.astop\.co\.jp/zone/en/caselist/([A-Z0-9]+)\.html)["\']', html)
        if not matches:
            break
        
        prev_len = len(all_case_urls)
        for full_url, code in matches:
            all_case_urls.add(full_url)
        
        new_added = len(all_case_urls) - prev_len
        print(f"[Main List] Page {page}: found {len(matches)} links ({new_added} new). Total: {len(all_case_urls)}")
        if new_added == 0 and page > 1:
            break
        page += 1
        
    return sorted(list(all_case_urls))

def parse_case_html(html, case_code, url):
    if not html:
        return None

    case_id_match = re.search(r'<div class="p-case__detailId[^"]*">\s*([A-Z0-9\-]+)\s*</div>', html)
    case_id = case_id_match.group(1).strip() if case_id_match else case_code
    
    date_match = re.search(r'<time datetime="([^"]+)">', html)
    update_date = date_match.group(1).strip() if date_match else ""
    
    categories = re.findall(r'<li class="p-case__detailCatListItem">\s*<a[^>]*>([^<]+)</a>\s*</li>', html)
    categories = [unescape(c.strip()) for c in categories]
    
    tags = re.findall(r'<li class="p-case__detailTagListItem">\s*<a[^>]*>([^<]+)</a>\s*</li>', html)
    tags = [unescape(t.strip()) for t in tags]
    
    title_match = re.search(r'<h3 class="p-case__detailTitle[^"]*">([^<]+)</h3>', html)
    title = unescape(title_match.group(1).strip()) if title_match else ""
    
    caption_match = re.search(r'<p class="p-case__detailCaption[^"]*">([^<]+)</p>', html)
    caption = unescape(caption_match.group(1).strip()) if caption_match else ""
    
    images = re.findall(r'class="p-case__detailLineupImage">\s*<img[^>]+data-src="([^"]+)"', html)
    if not images:
        images = re.findall(r'class="p-case__detailLineupImage">\s*<img[^>]+src="([^"]+)"', html)
        
    if not images:
        rep_img = re.search(r'class="p-case__detailImage[^"]*">\s*<img[^>]+data-src="([^"]+)"', html)
        if rep_img:
            images = [rep_img.group(1)]
            
    num_match = re.search(r'(\d+)', case_id)
    number = int(num_match.group(1)) if num_match else 0
    letter_match = re.search(r'([A-Z]+)', case_id)
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
        "images": images,
        "url": url
    }

def scrape_single_case(url):
    code_match = re.search(r'/caselist/([A-Z0-9]+)\.html', url)
    code = code_match.group(1) if code_match else url
    html = fetch_url(url)
    return parse_case_html(html, code, url)

def save_checkpoint(cases_data):
    cases_data.sort(key=lambda c: (c['letter'], c['number'], c['id']))
    all_tags = set()
    total_images = 0
    for case in cases_data:
        all_tags.update(case['tags'])
        total_images += len(case['images'])

    out_file = "cases_data.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "cases": cases_data,
            "tags": sorted(list(all_tags)),
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_cases": len(cases_data),
            "total_images": total_images
        }, f, ensure_ascii=False, indent=2)

def main():
    print("=== Discovering Case URLs ===")
    case_urls = discover_case_urls()
    print(f"Discovered {len(case_urls)} unique cases.")
    
    print("=== Scraping Case Metadata (High Parallelism) ===")
    cases_data = []
    completed = 0
    
    with ThreadPoolExecutor(max_workers=25) as executor:
        future_to_url = {executor.submit(scrape_single_case, url): url for url in case_urls}
        for future in as_completed(future_to_url):
            res = future.result()
            completed += 1
            if res:
                cases_data.append(res)
            if completed % 25 == 0 or completed == len(case_urls):
                print(f"Scraped {completed}/{len(case_urls)} cases...")
                save_checkpoint(cases_data)

    save_checkpoint(cases_data)
    print(f"\n=== Complete! Saved {len(cases_data)} cases to cases_data.json ===")

if __name__ == '__main__':
    main()
