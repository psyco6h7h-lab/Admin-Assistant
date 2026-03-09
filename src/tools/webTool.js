const cheerio = require('cheerio');

async function webSearch(query) {
    try {
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const results = [];
        $('.result').each((i, el) => {
            if (i < 4) {
                const title = $(el).find('.result__title').text().replace(/\n/g, '').trim();
                const snippet = $(el).find('.result__snippet').text().trim();
                const url = $(el).find('.result__url').attr('href');
                
                if (title && snippet) {
                    let cleanUrl = url;
                    if (url && url.startsWith('//duckduckgo.com/l/?uddg=')) {
                        try {
                            cleanUrl = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                        } catch (e) {}
                    }
                    results.push(`Title: ${title}\nSnippet: ${snippet}\nSource: ${cleanUrl || url}`);
                }
            }
        });

        if (results.length === 0) {
            if (html.includes("If this error persists")) {
                return "Web Search Error: Search engine temporarily blocked the request. Please try again later.";
            }
            return "No internet results found for your query.";
        }

        return results.join('\n\n');
    } catch (error) {
        return `Web Search Request Error: ${error.message}`;
    }
}

module.exports = { webSearch };
