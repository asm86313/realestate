-- =====================================================================
-- 일회성 데이터 정리: 관천 통장 내역 중 "마천동 대출이자"에도 "은행이자" 카테고리를 붙인다.
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상이 몇 건인지, 정확히 원하시는 내역이 맞는지 먼저 확인하세요.
select id, date, purpose, income, expense, "reportId"
from "Ledger"
where "bankAccountId" = (select id from "BankAccounts" where name like '%관천%' limit 1)
	and purpose like '%마천동%'
	and purpose like '%대출이자%'
order by "createdAt" desc;

-- 2) "은행이자" 요약표가 이미 있으면 재사용하고, 없으면 새로 만든다.
insert into "LedgerReports" ("bldId", "title")
select "bldId", '은행이자' from "BankAccounts" where name like '%관천%' limit 1
on conflict ("bldId", "title") do nothing;

-- 3) 1번 목록이 맞으면 아래 UPDATE를 실행하세요.
update "Ledger"
set "reportId" = (
	select id from "LedgerReports"
	where "bldId" = (select "bldId" from "BankAccounts" where name like '%관천%' limit 1)
		and title = '은행이자'
)
where "bankAccountId" = (select id from "BankAccounts" where name like '%관천%' limit 1)
	and purpose like '%마천동%'
	and purpose like '%대출이자%';

-- 4) 확인: 몇 건이 반영됐는지
select id, date, purpose, "reportId"
from "Ledger"
where "bankAccountId" = (select id from "BankAccounts" where name like '%관천%' limit 1)
	and purpose like '%마천동%'
	and purpose like '%대출이자%';
