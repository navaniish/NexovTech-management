const axios = require('axios');

/**
 * Decodes basic HTML entities commonly found in search snippets.
 * @param {string} str - Raw HTML string
 * @returns {string} Clean decoded string
 */
function cleanHtmlText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '') // Strip tags
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Performs a live web search using Yahoo Search scraping (API-keyless, free)
 * @param {string} query - The search query
 * @returns {Promise<Array<{url: string, title: string, snippet: string}>>} List of search results
 */
async function performLiveSearch(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://search.yahoo.com/search?p=${encodedQuery}`;
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  try {
    console.log(`📡 [SCRAPER] Fetching live Yahoo search results for: "${query}"`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      timeout: 12000
    });
    
    const html = response.data || '';
    const results = [];
    let index = 0;
    
    while ((index = html.indexOf('/RU=http', index)) !== -1) {
      const endUrlIdx = html.indexOf('/RK=', index);
      if (endUrlIdx === -1) {
        index += 10;
        continue;
      }
      
      const rawUrl = html.substring(index + 4, endUrlIdx);
      let decodedUrl = '';
      try {
        decodedUrl = decodeURIComponent(rawUrl);
      } catch (e) {
        decodedUrl = rawUrl;
      }
      
      // Filter out search engine or tracker domains
      if (
        decodedUrl.includes('yahoo.com') ||
        decodedUrl.includes('yimg.com') ||
        decodedUrl.includes('yahoo.co') ||
        decodedUrl.includes('google.com') ||
        decodedUrl.includes('bing.com') ||
        decodedUrl.includes('live.com') ||
        decodedUrl.includes('microsoft.com') ||
        decodedUrl.includes('doubleclick.net')
      ) {
        index += 10;
        continue;
      }
      
      // Grab 2000 characters context after the match to extract Title and Snippet
      const afterLink = html.substring(index, index + 2000);
      
      let title = '';
      const h3Match = afterLink.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      if (h3Match) {
        title = cleanHtmlText(h3Match[1]);
      }
      
      let snippet = '';
      const compTextMatch = afterLink.match(/<div class="compText[^>]*>([\s\S]*?)<\/div>/);
      if (compTextMatch) {
        snippet = cleanHtmlText(compTextMatch[1]);
      }
      
      if (title && !results.some(r => r.url === decodedUrl)) {
        results.push({
          url: decodedUrl,
          title,
          snippet
        });
      }
      
      index += 10;
    }
    
    console.log(`✅ [SCRAPER] Extracted ${results.length} unique external search results from Yahoo.`);
    return results;
  } catch (error) {
    console.error(`❌ [SCRAPER] Yahoo search live fetch failed: ${error.message}`);
    return [];
  }
}

module.exports = {
  performLiveSearch
};
