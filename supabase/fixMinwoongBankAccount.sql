-- =====================================================================
-- 일회성 데이터 정리: "민웅" 통장으로 들어간 내역에 "은행이자" 카테고리를 붙인다.
-- (혹시 이번에도 통장 없음(null)으로 잘못 들어간 게 있으면 먼저 옮기고 나서 카테고리를 붙인다)
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상 통장이 정확히 하나만 걸리는지 확인하세요 ("민웅"이 들어간 통장)
select id, name, "bldId" from "BankAccounts" where name like '%민웅%';

-- 2) 혹시 통장 없음(null)으로 남아있는 내역이 있는지 확인 (있으면 방금 그 내역들이 맞는지 확인)
select id, date, purpose, income, expense, "createdAt"
from "Ledger"
where "bldId" = (select "bldId" from "BankAccounts" where name like '%민웅%' limit 1)
	and "bankAccountId" is null
order by "createdAt" desc;

-- 3) 2번에 방금 넣은 내역이 있었다면 아래 UPDATE로 민웅 통장으로 옮기세요.
--    (2번이 비어있었다면 이 단계는 건너뛰어도 됩니다)
update "Ledger"
set "bankAccountId" = (select id from "BankAccounts" where name like '%민웅%' limit 1)
where "bldId" = (select "bldId" from "BankAccounts" where name like '%민웅%' limit 1)
	and "bankAccountId" is null;

-- 4) "은행이자" 요약표가 이미 있으면 재사용하고, 없으면 새로 만든다.
insert into "LedgerReports" ("bldId", "title")
select "bldId", '은행이자' from "BankAccounts" where name like '%민웅%' limit 1
on conflict ("bldId", "title") do nothing;

-- 5) 민웅 통장으로 들어간 내역 전부에 "은행이자" 카테고리를 붙인다.
update "Ledger"
set "reportId" = (
	select id from "LedgerReports"
	where "bldId" = (select "bldId" from "BankAccounts" where name like '%민웅%' limit 1)
		and title = '은행이자'
)
where "bankAccountId" = (select id from "BankAccounts" where name like '%민웅%' limit 1);

-- 6) 확인: 몇 건이 "은행이자" 카테고리로 잡혔는지
select count(*) from "Ledger"
where "reportId" = (
	select id from "LedgerReports"
	where "bldId" = (select "bldId" from "BankAccounts" where name like '%민웅%' limit 1)
		and title = '은행이자'
);
