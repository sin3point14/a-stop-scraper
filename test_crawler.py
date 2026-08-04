import urllib.request
import re
import json
import time

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

# Test crawling main case list pages
def get_all_case_urls():
    case_urls = set()
    page = 1
    max_pages = 200 # safeguard
    
    while page <= max_pages:
        url = f"https://www.astop.co.jp/zone/en/caselist/page/{page}/" if page > 1 else "https://www.astop.co.jp/zone/en/caselist/"
        print(f"Fetching page {page}: {url}")
        html = fetch_url(url)
        if not html:
            break
        
        # Find case detail links e.g. href="https://www.astop.co.jp/zone/en/caselist/W86.html"
        matches = re.findall(r'href=["\'](https://www\.astop\.co\.jp/zone/en/caselist/([A-Z0-9]+)\.html)["\']', html)
        if not matches:
            # Try block search if page pagination stopped or didn't match
            print(r"No matches found on page", page)
            break
            
        new_found = 0
        for full_url, case_code in matches:
            if full_url not in case_urls:
                case_urls.add(full_url)
                new_found += 1
                
        print(f"Page {page}: found {len(matches)} links, {new_found} new. Total unique: {len(case_urls)}")
        if new_found == 0 and page > 1:
            break
        page += 1
        time.sleep(0.3)
        
    return sorted(list(case_urls))

if __name__ == '__main__':
    urls = get_all_case_urls()
    print(f"Total case URLs found: {len(urls)}")
    print("Sample URLs:", urls[:10])
