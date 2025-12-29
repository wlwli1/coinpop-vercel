const express = require('express');
const path = require('path');
const app = express();

const NAVER_ID = 'kj1nhon9o114';

// 1. HTML 파일 보여주기 (public 폴더 연결)
app.use(express.static(path.join(__dirname, 'public')));

// 2. 리다이렉트 중계소 (/go)
app.get('/go', (req, res) => {
    const destination = req.query.url;
    if (!destination) return res.redirect('/');
    res.redirect(301, destination);
});

// 3. RSS 변환기 (/naver/rss)
app.get('/naver/rss', async (req, res) => {
    // Vercel 주소 자동 감지
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    
    const WRAPPER = `${MY_DOMAIN}/go?url=`;
    const TARGET_RSS_URL = `https://rss.blog.naver.com/${NAVER_ID}.xml`;

    try {
        const response = await fetch(TARGET_RSS_URL);
        if (!response.ok) throw new Error('RSS Fetch Failed');

        let xmlData = await response.text();

        // 중복 껍데기 제거 (청소)
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 껍데기 입히기
        xmlData = xmlData.replaceAll(
            'https://blog.naver.com', 
            `${WRAPPER}https://blog.naver.com`
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('RSS Error');
    }
});








//미디엄
app.get('/medium/rss', async (req, res) => {
    const MEDIUM_ID = '@winnerss';
    const TARGET_RSS_URL = `https://medium.com/feed/${MEDIUM_ID}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        // [캐시 방지] 브라우저가 옛날 에러 화면 기억 못 하게 설정
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const response = await fetch(TARGET_RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Medium Error: ${response.status}`);

        let xmlData = await response.text();

        // =========================================================
        // [핵심 해결] <rss 태그 앞부분을 무조건 다 잘라냄
        // 1. <?xml ... ?> 선언부 제거 (Prolog 에러 원천 차단)
        // 2. 앞에 붙은 숫자, 공백, BOM 등 쓰레기값 제거
        // =========================================================
        const rssStartIndex = xmlData.indexOf('<rss');
        
        if (rssStartIndex === -1) {
             // rss 태그가 없으면 에러로 간주 (HTML 차단 메시지 등)
             console.error('No <rss> tag found. Data:', xmlData.substring(0, 100));
             res.set('Content-Type', 'text/plain');
             return res.send('[Error] Medium Server did not return RSS XML.');
        }

        // <rss> 위치부터 시작하도록 자름
        xmlData = xmlData.substring(rssStartIndex);

        // 1. WRAPPER 중복 제거
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 2. <link> 태그 주소 변환
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // 3. <atom:link> 태그 주소 변환
        xmlData = xmlData.replace(
            /(<atom:link href=")(.*?)(")/g,
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // [최종 설정] 이제 다시 XML로 선언
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error(error);
        res.setHeader('Content-Type', 'text/plain');
        res.status(500).send(`Server Error: ${error.message}`);
    }
});















// =========================================================
// [기능 5] X(트위터) RSS 변환기 (자동 우회 시스템 적용)
// =========================================================
app.get('/x/rss', async (req, res) => {
    const TWITTER_ID = 'youwo296196';

    // [핵심] 살아있는 Nitter 서버 후보군 (순서대로 시도함)
    const BRIDGES = [
        'https://nitter.poast.org',
        'https://nitter.privacydev.net',
        'https://nitter.lucabased.xyz',
        'https://nitter.soopy.moe',
        'https://nitter.uni-sonia.com'
    ];

    // Vercel 주소 감지
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    let xmlData = null;
    let usedBridge = '';

    // [반복문] 살아있는 서버 찾기 (1번부터 차례대로 노크)
    for (const bridge of BRIDGES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000); // 4초 타임아웃

            console.log(`Trying Bridge: ${bridge}...`);
            const response = await fetch(`${bridge}/${TWITTER_ID}/rss`, { signal: controller.signal });
            clearTimeout(timeout);

            if (response.ok) {
                xmlData = await response.text();
                // RSS 데이터가 너무 짧거나(차단됨), 에러 메시지면 패스
                if (!xmlData.includes('<rss') || xmlData.includes('Error')) {
                    throw new Error('Blocked content');
                }
                usedBridge = bridge;
                console.log(`Success with: ${bridge}`);
                break; // 성공했으니 반복문 탈출!
            }
        } catch (e) {
            console.log(`Failed: ${bridge}`);
            continue; // 실패하면 다음 후보로 넘어감
        }
    }

    // 모든 후보가 다 실패했을 경우
    if (!xmlData) {
        res.set('Content-Type', 'application/xml');
        return res.send(`
            <rss version="2.0">
                <channel>
                    <title>All Bridges Blocked</title>
                    <description>Twitter is blocking all Nitter instances currently.</description>
                </channel>
            </rss>
        `);
    }

    // ================= [데이터 세탁] =================
    try {
        // 1. 성공한 Nitter 주소를 -> x.com으로 변경
        const bridgeRegex = new RegExp(usedBridge, 'g'); 
        xmlData = xmlData.replace(bridgeRegex, 'https://x.com');
        
        // 2. 혹시 모를 twitter.com -> x.com 통일
        xmlData = xmlData.replaceAll('https://twitter.com', 'https://x.com');

        // 3. 중복 껍데기 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 4. 최종 포장
        xmlData = xmlData.replaceAll(
            'https://x.com', 
            `${WRAPPER}https://x.com`
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error("X Processing Error:", error);
        res.status(500).send('Processing Error');
    }
});




// [중요] Vercel은 이 부분을 봅니다.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
