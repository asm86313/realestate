-- =====================================================================
-- 일회성 데이터 정리: "김주대출금" 카테고리의 내역 전부를 자동계산 규칙으로 다시 채운다.
-- 빌린일수 = 오늘 - 그 내역의 날짜 (다른 내역은 안 봄, 각자 독립 계산)
-- 이자 = 원금(입금 없으면 출금) × 금리(%) × 빌린일수 / 365 (단리, 반올림)
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상 내역과 지금 값을 먼저 확인하세요.
select id, date, purpose, income, expense, "interestRate", "borrowedDays", "interestAmount"
from "Ledger"
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1)
order by date;

-- 2) 확인됐으면 아래 UPDATE를 실행하세요.
update "Ledger"
set "borrowedDays" = (current_date - date),
	"interestAmount" = round(
		coalesce(nullif(income, 0), expense, 0)
		* coalesce("interestRate", 0) / 100
		* (current_date - date)::numeric / 365
	)
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1)
	and date is not null;

-- 3) 확인: 바뀐 값들
select id, date, purpose, income, expense, "interestRate", "borrowedDays", "interestAmount"
from "Ledger"
where "reportId" = (select id from "LedgerReports" where title = '김주대출금' limit 1)
order by date;
