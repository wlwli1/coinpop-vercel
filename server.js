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
    
    // ... (기본 설정 유지) ...
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        const response = await fetch(TARGET_RSS_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 ...' }
        });

        if (!response.ok) throw new Error(`Medium Error: ${response.status}`);

        let xmlData = await response.text();

        // [수정] 무조건 자르는 substring 제거!
        // 대신 맨 앞의 공백(화이트스페이스)만 제거 (trim)
        xmlData = xmlData.trim();

        // 만약 가져온 데이터에 <?xml ... ?> 선언이 아예 없다면 강제로 붙여주는 것이 안전함
        if (!xmlData.startsWith('<?xml')) {
            xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlData;
        }

        // 1. WRAPPER 중복 제거
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 2. <link> 태그 주소 변환 (기존 로직 유지)
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    // CDATA가 있을 수 있으므로 단순 텍스트일 때만 처리하거나 주의 필요
                    // 여기서는 기존 로직 유지
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );
        // <atom:link> 처리 등 기존 로직 유지...
        xmlData = xmlData.replace(
            /(<atom:link href=")(.*?)(")/g,
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send(`Server Error: ${error.message}`);
    }
});














// =========================================================
// [유튜브 RSS] 유튜브는 <feed> 태그를 사용하는 Atom 방식입니다.
// =========================================================
app.get('/youtube/rss', async (req, res) => {
    const CHANNEL_ID = 'UCap7iEkd2bYDiR3eQ67rl3g'; 
    const TARGET_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    
    // ... (기본 설정 유지) ...
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        const response = await fetch(TARGET_RSS_URL);
        if (!response.ok) throw new Error(`YouTube Error: ${response.status}`);

        let xmlData = await response.text();

        // [수정] 머리 자르는 코드 삭제 (substring 제거)
        xmlData = xmlData.trim(); // 공백만 제거

        // 유튜브는 기본적으로 <?xml ...?>을 잘 줍니다. 건드리지 마세요.

        // 1. 기존 WRAPPER 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 2. 링크 주소 포장 (기존 로직 유지)
        xmlData = xmlData.replace(
            /(href=")(https:\/\/www\.youtube\.com\/watch\?v=)(.*?)(")/g, 
            (match, p1, p2, p3, p4) => {
                if (match.includes(MY_DOMAIN)) return match;
                return `${p1}${WRAPPER}${p2}${p3}${p4}`;
            }
        );

        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        // ... 에러 처리
        res.status(500).send(`Error`);
    }
});








// =========================================================
// [서브스택 RSS] Prolog 에러 방지 & 링크 변환 적용 완료
// =========================================================
app.get('/substack/rss', async (req, res) => {
    // 님 서브스택 아이디 (주소 맨 뒤 @coinpop 부분에서 @ 뺀 것)
    const SUBSTACK_USER = 'coinpop'; 
    const TARGET_RSS_URL = `https://${SUBSTACK_USER}.substack.com/feed`;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        // 1. 캐시 방지 (에러 화면 기억 삭제)
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // 2. RSS 데이터 가져오기
        const response = await fetch(TARGET_RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        if (!response.ok) throw new Error(`Substack Error: ${response.status}`);

        let xmlData = await response.text();

        // =========================================================
        // [핵심] XML 선언부(<?xml...?>) 및 앞부분 공백 제거
        // 서브스택도 <rss> 태그를 사용하므로 <rss 찾아서 앞부분 다 자름
        // =========================================================
        const rssStartIndex = xmlData.indexOf('<rss');
        
        if (rssStartIndex === -1) {
             console.error('No <rss> tag found in Substack response.');
             res.set('Content-Type', 'text/plain');
             return res.send('[Error] Substack이 RSS XML을 주지 않았습니다.');
        }

  xmlData = xmlData.trim(); // 공백만 제거

        // 3. 기존 껍데기(WRAPPER) 중복 방지 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // 4. <link> 태그 주소 포장 (내 사이트 거쳐가게 만들기)
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                // 서브스택 링크이면서, 내 도메인이 아직 안 붙은 것만 처리
                if (p2.includes('substack.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // 5. 응답 전송
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error(error);
        res.set('Content-Type', 'text/plain');
        res.status(500).send(`Substack Server Error: ${error.message}`);
    }
});




















// [중요] Vercel은 이 부분을 봅니다.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
