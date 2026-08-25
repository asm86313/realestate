-- =====================================================================
-- 일회성 데이터 정리: 성민/민웅 통장 내역 중 입금액만 있고 출금액이 비어있는 것들에,
-- 입금액은 그대로 두고 같은 금액을 출금액에도 채워넣는다 (입금/출금 둘 다 채움).
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상이 몇 건인지, 방금 넣으신 내역이 맞는지 먼저 확인하세요.
select id, date, purpose, income, expense
from "Ledger"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and "income" is not null
	and "expense" is null
order by "createdAt" desc;

-- 2) 위 목록이 맞으면 아래 UPDATE를 실행하세요. (입금액은 그대로 두고, 출금액에 같은 값을 채운다)
update "Ledger"
set "expense" = "income"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and "income" is not null
	and "expense" is null;

-- 3) 확인: 몇 건이 바뀌었는지 (1번과 같은 조건으로 다시 조회하면 이번엔 비어있어야 정상)
select count(*) from "Ledger"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and "income" is not null
	and "expense" is null;
