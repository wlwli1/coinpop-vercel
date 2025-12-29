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

    // 내 도메인 설정
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const MY_DOMAIN = `${protocol}://${host}`;
    const WRAPPER = `${MY_DOMAIN}/go?url=`;

    try {
        const response = await fetch(TARGET_RSS_URL, {
            headers: {
                // 일반 브라우저인 척 위장
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Medium Server Error: ${response.status}`);
        }

        let xmlData = await response.text();

        // =========================================================
        // [핵심 수정] 무식하지만 확실한 방법
        // 맨 앞에서부터 '<?xml' 이라는 글자가 어디있는지 찾습니다.
        // =========================================================
        const xmlStartIndex = xmlData.indexOf('<?xml');

        // 1. 만약 '<?xml' 이라는 글자가 아예 없다면? -> 차단당했거나 HTML임
        if (xmlStartIndex === -1) {
            console.error('Not an XML format. Response starts with:', xmlData.substring(0, 50));
            // 브라우저에서 원인을 눈으로 볼 수 있게 text/plain으로 에러 내용 출력
            res.set('Content-Type', 'text/plain; charset=utf-8');
            return res.send(`[Error] Medium이 XML을 주지 않았습니다.\n\n받은 데이터 앞부분:\n${xmlData.substring(0, 500)}`);
        }

        // 2. '<?xml' 앞부분에 있는 모든 찌꺼기(공백, BOM, 쓰레기값) 잘라내기
        if (xmlStartIndex > 0) {
            xmlData = xmlData.substring(xmlStartIndex);
        }

        // 3. 기존 로직 수행 (링크 변환)
        
        // WRAPPER 청소
        while (xmlData.includes(WRAPPER)) {
            xmlData = xmlData.replaceAll(WRAPPER, '');
        }

        // <link> 변환
        xmlData = xmlData.replace(
            /(<link>)(.*?)(<\/link>)/g, 
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // <atom:link> 변환
        xmlData = xmlData.replace(
            /(<atom:link href=")(.*?)(")/g,
            (match, p1, p2, p3) => {
                if (p2.includes('medium.com') && !p2.includes(MY_DOMAIN)) {
                    return `${p1}${WRAPPER}${p2}${p3}`;
                }
                return match;
            }
        );

        // [중요] Content-Type 설정
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xmlData);

    } catch (error) {
        console.error('RSS Process Error:', error);
        // 에러 상황을 보기 위해 text/plain으로 출력
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.status(500).send(`Server Error 발생:\n${error.message}`);
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
