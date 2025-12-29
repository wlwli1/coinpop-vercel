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




app.get('/medium/rss', async (req, res) => {
    const MEDIUM_ID = '@winnerss';
    const TARGET_RSS_URL = `https://medium.com/feed/${MEDIUM_ID}`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        const response = await fetch(TARGET_RSS_URL, {
            headers: {
                // User-Agent를 조금 더 일반적인 브라우저처럼 변경 (차단 우회 시도)
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Medium Status Error: ${response.status}`);

        let xmlData = await response.text();

        // [안전장치 1] BOM(Byte Order Mark) 및 앞뒤 공백 제거
        // 눈에 안 보이는 \uFEFF 문자가 에러의 주범일 수 있음
        xmlData = xmlData.replace(/^\uFEFF/, '').trim();

        // [안전장치 2] 진짜 XML인지 확인
        // Medium이 차단하면 HTML(<!DOCTYPE html...)을 보내는데, 이걸 XML로 보내면 에러남
        if (!xmlData.startsWith('<?xml')) {
            console.error('Medium returned HTML instead of XML (Likely Blocked):', xmlData.substring(0, 100));
            return res.status(503).send('Medium Server Blocked Bot request. Please try again later.');
        }

        // 1. 기존 껍데기 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 2. 주소 포장 (정규식: <link> 태그 내부만 타겟)
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                // p2(주소)에 내 도메인이 이미 없고, medium이 포함된 경우만
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // 3. Atom Link 태그 처리
        xmlData = xmlData.replace(
            /(<atom:link href=")(.*?)(")/g,
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error('RSS Error:', error);
        res.status(500).send('Server Error');
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
