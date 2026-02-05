const express = require('express');
const path = require('path');
const Parser = require('rss-parser'); // [추가됨] RSS 해석기
const app = express();
const parser = new Parser(); // [추가됨] 파서 초기화

const NAVER_ID = 'kj1nhon9o114';

// 1. HTML 파일 보여주기
app.use(express.static(path.join(__dirname, 'public')));

// 2. 리다이렉트 중계소 (/go)
app.get('/go', (req, res) => {
    const destination = req.query.url;
    if (!destination) return res.redirect('/');
    res.redirect(301, destination);
});

// =========================================================
// [신규] CoinPop Talk (SEO 최적화 HTML 페이지)
// 주소: /coinpoptalk
// =========================================================
app.get('/coinpoptalk', async (req, res) => {
    const FEED_URL = 'https://talk.coinpopbit.com/public/atom';

    try {
        // 1. Atom 피드 데이터 가져오기 (서버에서 실행)
        const feed = await parser.parseURL(FEED_URL);

        // 2. HTML 머리말 (SEO 메타태그 포함)
        let html = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CoinPopBit Talk - 최신 토론</title>
                <meta name="description" content="CoinPopBit 커뮤니티의 최신 암호화폐 토론 글 모음">
                <meta name="robots" content="index, follow">
                <link rel="canonical" href="https://talk.coinpopbit.com">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0; color: #333; }
                    .container { max-width: 720px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                    header { background-color: #fff; padding: 20px; border-bottom: 1px solid #eee; text-align: center; position: sticky; top: 0; }
                    h1 { font-size: 20px; margin: 0; font-weight: 700; color: #111; }
                    .subtitle { font-size: 12px; color: #888; margin-top: 5px; }
                    .post-list { list-style: none; padding: 0; margin: 0; }
                    .post-item { border-bottom: 1px solid #f1f1f1; padding: 20px; transition: background 0.2s; }
                    .post-item:hover { background-color: #fafafa; }
                    .post-date { font-size: 12px; color: #999; margin-bottom: 6px; }
                    .post-title { font-size: 17px; margin: 0 0 8px 0; line-height: 1.4; font-weight: 600; }
                    .post-title a { text-decoration: none; color: #222; display: block; }
                    .post-title a:hover { color: #0070f3; }
                    .post-desc { font-size: 14px; color: #555; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
                    footer { padding: 30px; text-align: center; font-size: 12px; color: #aaa; background: #f8f9fa; }
                    .btn-home { display: inline-block; margin-top: 15px; padding: 8px 16px; background: #222; color: #fff; text-decoration: none; border-radius: 4px; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>CoinPopBit Talk</h1>
                        <p class="subtitle">Latest Discussions & News</p>
                    </header>
                    <ul class="post-list">
        `;

        // 3. 게시글 목록 생성 (리다이렉트 없이 원본 링크 사용)
        feed.items.forEach(item => {
            // 요약문 텍스트만 추출 및 길이 제한
            let summary = item.contentSnippet || item.content || '';
            summary = summary.replace(/<[^>]*>?/gm, ''); 
            if (summary.length > 120) summary = summary.substring(0, 120) + '...';
            
            // 날짜 포맷
            const dateStr = new Date(item.pubDate || item.isoDate).toLocaleDateString('ko-KR');

            html += `
                <li class="post-item">
                    <div class="post-date">${dateStr}</div>
                    <h2 class="post-title">
                        <a href="${item.link}" target="_blank">${item.title}</a>
                    </h2>
                    <p class="post-desc">${summary}</p>
                </li>
            `;
        });

        // 4. HTML 꼬리말
        html += `
                    </ul>
                    <footer>
                        <p>Curated by CoinPopBit</p>
                        <a href="https://talk.coinpopbit.com" target="_blank" class="btn-home">커뮤니티 바로가기</a>
                    </footer>
                </div>
            </body>
            </html>
        `;

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).send('<h3>Feed Load Error</h3><p>잠시 후 다시 시도해주세요.</p>');
    }
});


// =========================================================
// [기존] 네이버 RSS 처리
// =========================================================
app.get('/naver/rss', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    
    const BRIDGE_PAGE = `${MY_DOMAIN}/naver.html`;
    const TARGET_RSS_URL = `https://rss.blog.naver.com/${NAVER_ID}.xml`;

    try {
        const response = await fetch(TARGET_RSS_URL);
        if (!response.ok) throw new Error('RSS Fetch Failed');

        let xmlData = await response.text();

        const postUrlPattern = `https://blog.naver.com/${NAVER_ID}/`;
        xmlData = xmlData.split(postUrlPattern).join(`${BRIDGE_PAGE}?logNo=`);

        const mainUrlPattern = `https://blog.naver.com/${NAVER_ID}`;
        xmlData = xmlData.split(mainUrlPattern).join(BRIDGE_PAGE);

        xmlData = xmlData.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('RSS Error');
    }
});

// =========================================================
// [기존] 서브스택 RSS 처리
// =========================================================
app.get('/substack/rss', async (req, res) => {
    const SUBSTACK_USER = 'coinpop'; 
    const TARGET_RSS_URL = `https://${SUBSTACK_USER}.substack.com/feed`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const response = await fetch(TARGET_RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        if (!response.ok) throw new Error(`Substack Error: ${response.status}`);

        let xmlData = await response.text();
        const rssStartIndex = xmlData.indexOf('<rss');
        
        if (rssStartIndex === -1) {
             console.error('No <rss> tag found');
             res.set('Content-Type', 'text/plain');
             return res.send('[Error] Substack RSS Fail');
        }

        xmlData = xmlData.substring(rssStartIndex).trim();
        if (!xmlData.startsWith('<?xml')) {
            xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlData;
        }

        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                if (p2.includes('substack.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error(error);
        res.set('Content-Type', 'text/plain');
        res.status(500).send(`Substack Server Error: ${error.message}`);
    }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
