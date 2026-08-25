-- =====================================================================
-- 일회성 데이터 정리: "성민" 탭에서 대량 등록했지만 통장 없음으로 잘못 저장된 내역을
-- "성민" 통장으로 옮긴다 (엑셀 붙여넣기가 통장 탭을 안 지키던 버그 때문에 생긴 데이터).
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상 통장이 정확히 하나만 걸리는지 확인하세요 ("성민"이 들어간 통장)
select id, name, "bldId" from "BankAccounts" where name like '%성민%';

-- 2) 지금 통장 없음(null)으로 남아있는 내역이 몇 건인지, 방금 그 내역들이 맞는지 확인하세요
--    (관천 마이그레이션 이후 생긴 null 내역은 기본적으로 이번에 잘못 들어간 것들일 가능성이 높음)
select id, date, purpose, income, expense, "createdAt"
from "Ledger"
where "bldId" = (select "bldId" from "BankAccounts" where name like '%성민%' limit 1)
	and "bankAccountId" is null
order by "createdAt" desc;

-- 3) 위 목록이 방금 밀어넣은 것들이 맞으면 아래 UPDATE를 실행하세요.
update "Ledger"
set "bankAccountId" = (select id from "BankAccounts" where name like '%성민%' limit 1)
where "bldId" = (select "bldId" from "BankAccounts" where name like '%성민%' limit 1)
	and "bankAccountId" is null;

-- 4) 확인: 몇 건이 "성민" 통장으로 잡혔는지
select count(*) from "Ledger"
where "bankAccountId" = (select id from "BankAccounts" where name like '%성민%' limit 1);

-- =====================================================================
-- 이어서: 방금 성민 통장으로 들어간 내역 전부에 "은행이자" 카테고리를 붙인다.
-- (3번까지 실행한 뒤에 이어서 실행하세요)
-- =====================================================================

-- 5) "은행이자" 요약표가 이미 있으면 재사용하고, 없으면 새로 만든다.
insert into "LedgerReports" ("bldId", "title")
select "bldId", '은행이자' from "BankAccounts" where name like '%성민%' limit 1
on conflict ("bldId", "title") do nothing;

-- 6) 성민 통장으로 들어간 내역 전부에 "은행이자" 카테고리를 붙인다.
update "Ledger"
set "reportId" = (
	select id from "LedgerReports"
	where "bldId" = (select "bldId" from "BankAccounts" where name like '%성민%' limit 1)
		and title = '은행이자'
)
where "bankAccountId" = (select id from "BankAccounts" where name like '%성민%' limit 1);

-- 7) 확인: 몇 건이 "은행이자" 카테고리로 잡혔는지
select count(*) from "Ledger"
where "reportId" = (
	select id from "LedgerReports"
	where "bldId" = (select "bldId" from "BankAccounts" where name like '%성민%' limit 1)
		and title = '은행이자'
);
