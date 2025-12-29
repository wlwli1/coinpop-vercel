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
    const TWITTER_ID = 'youwo296196';
    
    // [수정함] 살아있는 다른 서버 목록 (하나씩 주석 풀어서 테스트 해보세요)
    // 1번 후보 (추천):
    const BRIDGE_URL = 'https://nitter.poast.org'; 
    // 2번 후보: 'https://nitter.lucabased.xyz';
    // 3번 후보: 'https://nitter.soopy.moe';

    const TARGET_RSS_URL = `${BRIDGE_URL}/${TWITTER_ID}/rss`;

    // Vercel 주소
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        // 타임아웃 설정 (3초 안에 안 되면 에러 처리)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(TARGET_RSS_URL, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) throw new Error('Twitter Bridge Blocked');

        let xmlData = await response.text();

        // 1. 우회 주소(nitter...)를 -> x.com으로 세탁
        const bridgeRegex = new RegExp(BRIDGE_URL, 'g'); 
        xmlData = xmlData.replace(bridgeRegex, 'https://x.com');
        
        // 2. twitter.com -> x.com 통일
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
        console.error("X RSS Error:", error.message);
        // 실패 시 에러 메시지 대신 빈 XML을 보내서 서버 다운 방지
        res.set('Content-Type', 'application/xml');
        res.send('<rss version="2.0"><channel><title>X RSS Error</title><description>Bridge Blocked</description></channel></rss>');
    }
});




// [중요] Vercel은 이 부분을 봅니다.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
