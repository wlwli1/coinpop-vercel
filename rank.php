<?php
// ==================================================================
// [설정 구간] 사장님 사이트와 키워드를 여기에 입력하세요.
// ==================================================================
$target_domain = 'coinpopbit.com';  // 찾을 내 도메인 (www 빼고 입력 추천)
$keyword       = '바이비트';         // 검색할 키워드
$max_page      = 10;                // 몇 페이지까지 뒤질까요? (너무 높게 잡으면 차단됨)
// ==================================================================

header('Content-Type: text/html; charset=utf-8');

echo "<h2>네이버 웹사이트 순위 추적기</h2>";
echo "<p>검색어: <strong>{$keyword}</strong> / 타겟: <strong>{$target_domain}</strong></p><hr>";

// 네이버 차단 방지를 위한 User-Agent 설정 (일반 윈도우 크롬인 척 위장)
$user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

$found = false;

// 페이지 반복 (1페이지 ~ $max_page)
for ($page = 1; $page <= $max_page; $page++) {
    
    // 네이버는 start 파라미터로 페이징 처리 (1, 11, 21...) - 웹사이트 탭은 보통 페이지당 10~15개
    // 여기서는 10개씩 끊긴다고 가정하고 계산
    $start_index = ($page - 1) * 10 + 1;
    
    // 네이버 웹사이트 탭 검색 URL
    $url = "https://search.naver.com/search.naver?where=web&query=" . urlencode($keyword) . "&start=" . $start_index;

    // cURL을 이용해 HTML 긁어오기
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 호스팅 인증서 문제 방지
    curl_setopt($ch, CURLOPT_USERAGENT, $user_agent);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $html = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code != 200 || empty($html)) {
        echo "<p style='color:red;'>[오류] 네이버 접속 실패 (차단되었거나 통신 오류)</p>";
        break;
    }

    // DOM 파싱 (HTML 구조 분석)
    $dom = new DOMDocument();
    @$dom->loadHTML($html); // HTML 형식이 완벽하지 않아도 경고 무시(@)
    $xpath = new DOMXPath($dom);

    // 네이버 웹사이트 결과 항목들은 보통 <li class="bx"> 또는 <div class="total_wrap"> 안에 있음
    // 링크 태그(a) 중에서 class가 'link_tit' 인 것들이 보통 제목 링크임
    $results = $xpath->query("//a[contains(@class, 'link_tit')]");

    // 결과가 없으면 종료 (끝 페이지 도달)
    if ($results->length == 0) {
        echo "<p>{$page}페이지: 검색 결과가 더 이상 없습니다.</p>";
        break;
    }

    echo "<p>{$page}페이지 검색 중... (발견된 문서 수: {$results->length}개)</p>";

    // 해당 페이지 내의 결과물 하나씩 검사
    $rank_in_page = 0;
    foreach ($results as $node) {
        $rank_in_page++;
        $href = $node->getAttribute('href');     // 링크 주소
        $title = $node->nodeValue;               // 글 제목

        // 내 도메인이 링크에 포함되어 있는지 확인
        if (strpos($href, $target_domain) !== false) {
            $total_rank = ($page - 1) * 10 + $rank_in_page;
            
            echo "<div style='background-color: #d4edda; padding: 10px; border: 1px solid #c3e6cb; margin: 10px 0;'>";
            echo "<h3>🎉 찾았습니다!</h3>";
            echo "<ul>";
            echo "<li><strong>페이지:</strong> {$page}페이지</li>";
            echo "<li><strong>순서:</strong> {$rank_in_page}번째</li>";
            echo "<li><strong>전체 예상 순위:</strong> 약 {$total_rank}위</li>";
            echo "<li><strong>링크:</strong> <a href='{$href}' target='_blank'>{$href}</a></li>";
            echo "<li><strong>제목:</strong> {$title}</li>";
            echo "</ul>";
            echo "</div>";
            
            $found = true;
            break 2; // 2중 포문 탈출 (찾았으니 끝)
        }
    }

    // 네이버 서버 부하 방지 및 차단 회피를 위해 페이지 넘길 때 잠깐 쉬기 (1~3초 랜덤)
    sleep(rand(1, 3));
    flush(); // 화면에 즉시 출력
}

if (!$found) {
    echo "<hr><h3 style='color:gray;'>검색 결과 {$max_page}페이지 내에서 찾지 못했습니다.</h3>";
    echo "<p>팁: '바이비트 코인팝' 처럼 브랜드명과 같이 검색되는지 먼저 확인해보세요.</p>";
}

?>