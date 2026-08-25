-- =====================================================================
-- 일회성 데이터 정리(2차): 이전 버전 스크립트가 이미 실행되어 입금액이 지워진
-- 성민/민웅 내역을 복구한다 - 지금 출금액에 남아있는 값을 입금액에도 그대로 채운다.
-- (최종 원하는 상태: 입금 = 출금, 둘 다 같은 값)
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- =====================================================================

-- 1) 대상이 몇 건인지, 방금 그 내역들이 맞는지 먼저 확인하세요.
select id, date, purpose, income, expense
from "Ledger"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and "expense" is not null
	and "income" is null
order by "createdAt" desc;

-- 2) 위 목록이 맞으면 아래 UPDATE를 실행하세요. (출금액을 그대로 입금액에도 채운다)
update "Ledger"
set "income" = "expense"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and "expense" is not null
	and "income" is null;

-- 3) 확인: 이제 성민/민웅 내역 중 입금·출금이 서로 다른(비대칭인) 게 있는지 확인 - 비어있어야 정상
select id, date, purpose, income, expense
from "Ledger"
where "bankAccountId" in (
	select id from "BankAccounts" where name like '%성민%' or name like '%민웅%'
)
	and (income is distinct from expense);
