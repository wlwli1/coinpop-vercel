const express = require('express');
const path = require('path');
const app = express();

const NAVER_ID = 'kj1nhon9o114';

// 1. HTML 파일 보여주기
app.use(express.static(path.join(__dirname, 'public')));

// 2. 리다이렉트 중계소 (/go) -> RSS에서 안 쓰지만, 혹시 다른 곳에 쓸 수 있어 남겨둠
app.get('/go', (req, res) => {
    const destination = req.query.url;
    if (!destination) return res.redirect('/');
    res.redirect(301, destination);
});








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

        // [방법 1] 상세 포스트 주소 치환 (가장 안전한 방식)
        // https://blog.naver.com/아이디/숫자 -> naver.html?logNo=숫자
        const postUrlPattern = `https://blog.naver.com/${NAVER_ID}/`;
        xmlData = xmlData.split(postUrlPattern).join(`${BRIDGE_PAGE}?logNo=`);

        // [방법 2] 메인 블로그 주소 및 기타 주소 치환
        // 포스트 번호가 없는 나머지 네이버 주소들을 BRIDGE_PAGE로 바꿈
        const mainUrlPattern = `https://blog.naver.com/${NAVER_ID}`;
        xmlData = xmlData.split(mainUrlPattern).join(BRIDGE_PAGE);

        // [방법 3] XML 문법 에러의 주범인 '&' 기호 처리
        // URL 파라미터에 포함된 &가 &amp;가 아니면 XML은 터집니다.
        // 이미 &amp;인 것은 건드리지 않고, 단독 &만 변환합니다.
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
        // [추가 추천] 혹시나 Substack이 <?xml 선언을 안 줬을 때를 대비한 안전장치
if (!xmlData.startsWith('<?xml')) {
    xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlData;
}

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
