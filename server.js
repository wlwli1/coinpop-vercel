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

// =========================================================
// [추가됨] 4. 미디엄 RSS 변환기 (/medium/rss)
// =========================================================
app.get('/medium/rss', async (req, res) => {
    const MEDIUM_ID = '@winnerss';
    const TARGET_RSS_URL = `https://medium.com/feed/${MEDIUM_ID}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        const response = await fetch(TARGET_RSS_URL);
        if (!response.ok) throw new Error('Medium RSS Fetch Failed');

        let xmlData = await response.text();

        // 1. 혹시 모를 중복 껍데기 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 2. 미디엄 주소 포장하기
        // (미디엄 링크는 모두 https://medium.com 으로 시작하므로 통째로 감쌉니다)
        xmlData = xmlData.replaceAll(
            'https://medium.com', 
            `${WRAPPER}https://medium.com`
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Medium RSS Error');
    }
});

// =========================================================
// [기능 5] X(트위터) RSS 변환기 (/x/rss)
// =========================================================
app.get('/x/rss', async (req, res) => {
    // 1. 가져올 트위터 아이디
    const TWITTER_ID = 'youwo296196';
    
    // 2. 우회 서버 (Nitter) 목록
    // 트위터가 막으면 이 주소를 다른 걸로 바꿔야 합니다. (구글에 'nitter instances' 검색)
    // 추천: 'https://nitter.privacydev.net', 'https://nitter.poast.org' 등
    const BRIDGE_URL = 'https://nitter.privacydev.net'; 
    const TARGET_RSS_URL = `${BRIDGE_URL}/${TWITTER_ID}/rss`;

    // Vercel 주소 및 포장지
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        const response = await fetch(TARGET_RSS_URL);
        if (!response.ok) throw new Error('Twitter RSS Bridge Failed');

        let xmlData = await response.text();

        // 3. 링크 주소 세탁 (Nitter 주소를 -> 원래 x.com 주소로 변경 후 -> 내 껍데기 씌우기)
        
        // (1) 먼저 우회 서버 주소(nitter...)를 진짜 트위터 주소(x.com)로 다 바꿉니다.
        // 정규식으로 'https://nitter...' 부분을 찾아서 'https://x.com'으로 변경
        const bridgeRegex = new RegExp(BRIDGE_URL, 'g'); // /https:\/\/nitter.../g
        xmlData = xmlData.replace(bridgeRegex, 'https://x.com');
        
        // (2) twitter.com도 x.com으로 통일
        xmlData = xmlData.replaceAll('https://twitter.com', 'https://x.com');

        // (3) 중복 껍데기 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // (4) 최종 포장 (x.com 주소를 내 주소로 감싸기)
        xmlData = xmlData.replaceAll(
            'https://x.com', 
            `${WRAPPER}https://x.com`
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('X(Twitter) RSS Error: Bridge server might be blocked.');
    }
});




// [중요] Vercel은 이 부분을 봅니다.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
