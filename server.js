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
// [신규] Naver Blog List (SEO 최적화 HTML 페이지)
// 주소: /naverblog
// =========================================================
app.get('/naverblog', async (req, res) => {
    // 상단에 정의된 NAVER_ID 변수 사용
    const FEED_URL = `https://rss.blog.naver.com/${NAVER_ID}.xml`;

    try {
        const feed = await parser.parseURL(FEED_URL);

        // 네이버 브랜드 컬러(초록색) 적용
        let html = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>위너위너 투자 기록 - 네이버 블로그</title>
                <meta name="description" content="위너위너의 네이버 블로그 최신 글 모음">
                <meta name="robots" content="index, follow">
               <!-- <link rel="canonical" href="https://blog.naver.com/${NAVER_ID}">-->
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f5f6f8; margin: 0; padding: 0; color: #333; }
                    .container { max-width: 720px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                    header { background-color: #fff; padding: 25px 20px; border-bottom: 1px solid #eee; text-align: center; }
                    .badge { display: inline-block; background: #03C75A; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 6px; border-radius: 4px; margin-bottom: 8px; }
                    h1 { font-size: 22px; margin: 0; font-weight: 700; color: #111; letter-spacing: -0.5px; }
                    .subtitle { font-size: 13px; color: #888; margin-top: 5px; }
                    .post-list { list-style: none; padding: 0; margin: 0; }
                    .post-item { border-bottom: 1px solid #f1f1f1; padding: 24px 20px; transition: background 0.2s; }
                    .post-item:hover { background-color: #fafafa; }
                    .post-date { font-size: 12px; color: #999; margin-bottom: 8px; }
                    .post-title { font-size: 18px; margin: 0 0 10px 0; line-height: 1.4; font-weight: 600; }
                    .post-title a { text-decoration: none; color: #222; display: block; }
                    .post-title a:hover { color: #03C75A; text-decoration: underline; }
                    .post-desc { font-size: 14px; color: #555; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
                    footer { padding: 30px; text-align: center; font-size: 12px; color: #aaa; background: #f8f9fa; border-top: 1px solid #eee; }
                    .btn-naver { display: inline-block; margin-top: 15px; padding: 8px 16px; background: #03C75A; color: #fff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <span class="badge">NAVER BLOG</span>
                        <h1>위너위너</h1>
                        <p class="subtitle">경제적 자유를 위한 투자 기록</p>
                    </header>
                    <ul class="post-list">
        `;

        feed.items.forEach(item => {
            // 요약문 텍스트만 추출 (네이버는 이미지 태그가 많으므로 제거 필수)
            let summary = item.contentSnippet || item.content || '';
            summary = summary.replace(/<[^>]*>?/gm, ''); 
            if (summary.length > 120) summary = summary.substring(0, 120) + '...';
            
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

        html += `
                    </ul>
                    <footer>
                        <p>Curated by 위너위너</p>
                        <a href="https://blog.naver.com/${NAVER_ID}" target="_blank" class="btn-naver">네이버 블로그 홈으로</a>
                    </footer>
                </div>
            </body>
            </html>
        `;

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).send('<h3>Naver Blog Feed Error</h3><p>잠시 후 다시 시도해주세요.</p>');
    }
});



// =========================================================
// [HTML] Substack Blog List (미디엄 스타일 적용)
// 주소: /substackblog
// =========================================================
app.get('/substackblog', async (req, res) => {
    const SUBSTACK_USER = 'coinpop'; 
    const FEED_URL = `https://${SUBSTACK_USER}.substack.com/feed`;

    try {
        // rss-parser를 이용해 피드 가져오기
        const feed = await parser.parseURL(FEED_URL);

        let html = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CoinPop - Substack Newsletter</title>
                <meta name="description" content="CoinPop의 서브스택 최신 뉴스레터 모음">
                <style>
                    /* 미디엄과 동일한 기본 스타일 */
                    body { font-family: 'Georgia', serif; background-color: #fff; margin: 0; padding: 0; color: #292929; }
                    .container { max-width: 680px; margin: 0 auto; padding: 40px 20px; }
                    header { margin-bottom: 50px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    h1 { font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -1px; }
                    .subtitle { font-size: 14px; color: #757575; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .post-list { list-style: none; padding: 0; }
                    .post-item { margin-bottom: 48px; }
                    .post-date { font-size: 13px; color: #757575; margin-bottom: 8px; }
                    .post-title { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.3; }
                    .post-title a { text-decoration: none; color: #292929; }
                    
                    /* 서브스택 브랜드 컬러(오렌지) 적용 */
                    .post-title a:hover { color: #FF6719; }
                    
                    .post-desc { font-size: 16px; color: #292929; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                    footer { margin-top: 80px; border-top: 1px solid #eee; padding-top: 40px; text-align: center; font-size: 14px; color: #757575; }
                    .btn-home { display: inline-block; margin-top: 10px; color: #FF6719; text-decoration: none; font-weight: bold; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>CoinPop Substack</h1>
                        <p class="subtitle">Latest Newsletters from @${SUBSTACK_USER}</p>
                    </header>
                    <div class="post-list">
        `;

        feed.items.forEach(item => {
            // 요약문 태그 제거 및 정리
            let summary = item.contentSnippet || item.content || '';
            summary = summary.replace(/<[^>]*>?/gm, ''); 
            
            // 날짜 포맷 (미디엄 스타일과 통일: 영어식 표기)
            const dateStr = new Date(item.pubDate || item.isoDate).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            });

            html += `
                <article class="post-item">
                    <div class="post-date">${dateStr}</div>
                    <h2 class="post-title"><a href="${item.link}" target="_blank">${item.title}</a></h2>
                    <p class="post-desc">${summary}</p>
                </article>
            `;
        });

        html += `
                    </div>
                    <footer>
                        <p>Powered by CoinPopBit Hub</p>
                        <a href="https://${SUBSTACK_USER}.substack.com" target="_blank" class="btn-home">Visit Original Substack →</a>
                    </footer>
                </div>
            </body>
            </html>
        `;

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).send('Substack Feed Error: 잠시 후 다시 시도해주세요.');
    }
});








// =========================================================
// [RSS] Naver Blog RSS 중계 (구글 콘솔 오류 해결판)
// 주소: /naverblog/rss
// =========================================================
app.get('/naverblog/rss', async (req, res) => {
    // 1. 내 도메인 주소 파악 (http vs https 자동 감지)
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    
    // 2. 링크 포장지 주소 (/go?url=...)
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    // 상단에 선언된 NAVER_ID 사용
    const FEED_URL = `https://rss.blog.naver.com/${NAVER_ID}.xml`;

    try {
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');

        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`Naver RSS Fetch Failed: ${response.status}`);

        let xmlData = await response.text();

        // [핵심 1] 네이버 도메인 링크를 -> 내 도메인 링크로 치환
        // 예: <link>https://blog.naver.com/...</link> 
        // -> <link>https://내도메인/go?url=https://blog.naver.com/...</link>
        
        // 정규식 설명: <link> 태그나 <guid> 태그 안의 네이버 주소를 찾음
        xmlData = xmlData.replace(
            /((?:<link>|<guid>|<guid isPermaLink="true">))(?:\s*<!\[CDATA\[)?\s*(https:\/\/blog\.naver\.com\/[^<\]]+)(?:\]\]>)?\s*(?=<\/(?:link|guid)>)/g,
            (match, tag, url) => {
                // 이미 변환된 게 아닐 때만 변환
                if (url.includes(MY_DOMAIN)) return match;
                return `${tag}${WRAPPER}${url}`;
            }
        );

        // [핵심 2] XML 문법 에러 수정 (& 기호 처리)
        // 네이버가 trackingCode=rss 같은 파라미터를 붙일 때 &를 그냥 써서 에러가 남.
        // 이를 &amp; 로 바꿔줘야 구글이 읽을 수 있음.
        xmlData = xmlData.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching Naver RSS');
    }
});






// [RSS] medium 페이지

app.get('/mediumblog', async (req, res) => {
    const FEED_URL = 'https://medium.com/feed/@winnerss';

    try {
        const feed = await parser.parseURL(FEED_URL);
        let html = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Medium - 최신 인사이트</title>
                <meta name="description" content="미디엄 블로그의 최신 암호화폐 및 기술 분석">
                <style>
                    body { font-family: 'Georgia', serif; background-color: #fff; margin: 0; padding: 0; color: #292929; }
                    .container { max-width: 680px; margin: 0 auto; padding: 40px 20px; }
                    header { margin-bottom: 50px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    h1 { font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -1px; }
                    .subtitle { font-size: 14px; color: #757575; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    .post-list { list-style: none; padding: 0; }
                    .post-item { margin-bottom: 48px; }
                    .post-date { font-size: 13px; color: #757575; margin-bottom: 8px; }
                    .post-title { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.3; }
                    .post-title a { text-decoration: none; color: #292929; }
                    .post-title a:hover { color: #1a8917; }
                    .post-desc { font-size: 16px; color: #292929; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                    footer { margin-top: 80px; border-top: 1px solid #eee; padding-top: 40px; text-align: center; font-size: 14px; color: #757575; }
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>Medium Stories</h1>
                        <p class="subtitle">Latest Insights from @winnerss</p>
                    </header>
                    <div class="post-list">
        `;

        feed.items.forEach(item => {
            let summary = item.contentSnippet || item.content || '';
            summary = summary.replace(/<[^>]*>?/gm, ''); 
            const dateStr = new Date(item.pubDate || item.isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            html += `
                <article class="post-item">
                    <div class="post-date">${dateStr}</div>
                    <h2 class="post-title"><a href="${item.link}" target="_blank">${item.title}</a></h2>
                    <p class="post-desc">${summary}</p>
                </article>
            `;
        });

        html += `
                    </div>
                    <footer>
                        <p>Powered by CoinPopBit Hub</p>
                    </footer>
                </div>
            </body>
            </html>
        `;
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        res.status(500).send('Medium Feed Error');
    }
});



// =========================================================
// [RSS] Medium RSS 중계 (차단 우회 + 구글 콘솔 최적화)
// 주소: /mediumblog/rss
// =========================================================
app.get('/mediumblog/rss', async (req, res) => {
    // 1. 내 도메인 주소 파악
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    const FEED_URL = 'https://medium.com/feed/@winnerss';

    try {
        // [중요] 미디엄 차단 방지용 헤더 추가 (마치 크롬 브라우저인 척 위장)
        const response = await fetch(FEED_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`Medium Server Blocked: ${response.status}`);
        }

        let xmlData = await response.text();

        // 2. XML 공백 제거 (구글이 공백에 민감함)
        xmlData = xmlData.trim();
        // 혹시 <?xml ... ?> 선언이 없으면 추가
        if (!xmlData.startsWith('<?xml')) {
            xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlData;
        }

        // 3. 링크 래핑 (내 도메인 주소로 포장) - 구글 콘솔 "사용할 수 없는 URL" 해결
        // <link> 태그 처리
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g,
            (match, p1, p2, p3) => {
                const url = p2.replace('<![CDATA[', '').replace(']]>', '').trim();
                if (url.includes(MY_DOMAIN)) return match;
                return `${p1}${WRAPPER}${encodeURIComponent(url)}${p3}`;
            }
        );

        // <guid> 태그 처리 (미디엄은 guid도 링크로 씀)
        xmlData = xmlData.replace(
            /(<guid isPermaLink="true">)(.*?)(<\/guid>)/g,
            (match, p1, p2, p3) => {
                const url = p2.replace('<![CDATA[', '').replace(']]>', '').trim();
                if (url.includes(MY_DOMAIN)) return match;
                return `${p1}${WRAPPER}${encodeURIComponent(url)}${p3}`;
            }
        );

        // <atom:link> 태그 처리 (RSS 자체 주소 래핑)
        xmlData = xmlData.replace(
            /<atom:link href="(.*?)"/g,
            (match, url) => {
                if (url.includes(MY_DOMAIN)) return match;
                return `<atom:link href="${WRAPPER}${encodeURIComponent(url)}"`;
            }
        );

        // 4. 특수문자 에러 방지 (& -> &amp;)
        xmlData = xmlData.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');

        // 5. 전송
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        // 에러 발생 시 XML 형식으로 에러 메시지 전송 (구글이 404/500보다는 이걸 더 잘 이해함)
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(500).send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>Error</title>
                    <description>Medium Fetch Error: ${error.message}</description>
                </channel>
            </rss>
        `);
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
