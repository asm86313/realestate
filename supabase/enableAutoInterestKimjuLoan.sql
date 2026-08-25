-- =====================================================================
-- 일회성 데이터 정리: "김주대출금" 카테고리 내역 전부 "이자 매일 자동 계산" 켜기.
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상 확인
select id, date, purpose, "interestRate", "interestAuto"
from "Ledger"
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1)
order by date;

-- 2) 켜기
update "Ledger"
set "interestAuto" = true
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1);

-- 3) 확인
select id, date, purpose, "interestRate", "interestAuto"
from "Ledger"
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1)
order by date;
