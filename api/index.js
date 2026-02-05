// api/index.js
const Parser = require('rss-parser');
const parser = new Parser();

export default async function handler(request, response) {
  const FEED_URL = 'https://talk.coinpopbit.com/public/atom';

  try {
    const feed = await parser.parseURL(FEED_URL);
    
    // HTML 머리말 생성
    let html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>코인팝톡 CoinPop Talk Archive</title>
        <meta name="description" content="최신 토론 아카이브">
        <style>
          body { font-family: sans-serif; max-width: 720px; margin: 0 auto; padding: 20px; }
          a { text-decoration: none; color: #333; }
          a:hover { color: #0056b3; }
          .post { border-bottom: 1px solid #eee; padding: 15px 0; }
          .date { font-size: 12px; color: #888; }
          h2 { margin: 5px 0; font-size: 18px; }
          p { font-size: 14px; color: #666; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        </style>
      </head>
      <body>
        <h1>코인팝톡 Feed</h1>
    `;

    // 게시글 반복문 (리스트 생성)
    feed.items.forEach(item => {
      // 요약문 태그 제거
      let summary = item.contentSnippet || item.content || '';
      if (summary.length > 150) summary = summary.substring(0, 150) + '...';

      html += `
        <div class="post">
          <div class="date">${new Date(item.pubDate || item.isoDate).toLocaleDateString()}</div>
          <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
          <p>${summary}</p>
        </div>
      `;
    });

    // HTML 꼬리말 닫기
    html += `
      </body>
      </html>
    `;

    // 완성된 HTML 전송
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.status(200).send(html);

  } catch (error) {
    console.error(error);
    response.status(500).send('<h1>Feed Load Failed</h1><p>잠시 후 다시 시도해주세요.</p>');
  }
}
