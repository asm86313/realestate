-- =====================================================================
-- 일회성 데이터 정리: 기존 장부 내역을 특정 통장으로 일괄 지정
-- Supabase 대시보드 > SQL Editor 에서 아래 순서대로 실행하세요.
-- (스키마 변경이 아니라 데이터 수정이라 한 번 돌리고 나면 이 파일은 지워도 됩니다)
-- =====================================================================

-- 1) 먼저 대상 건물이 정확히 하나만 걸리는지 확인하세요 (송파 건물)
select id, address from "Buildings" where address like '%송파%';

-- 2) 대상 통장이 정확히 하나만 걸리는지 확인하세요 ("관천"이 들어간 통장)
select id, name from "BankAccounts" where name like '%관천%';

-- 3) 위 두 쿼리가 각각 정확히 1건씩만 나왔다면, 아래 UPDATE를 실행하세요.
--    (이미 다른 통장이 지정된 내역이 있다면 그것까지 덮어쓰니, 필요하면
--     `and "bankAccountId" is null` 조건을 마지막 줄에 추가해서 미지정 내역만 옮기세요)
update "Ledger"
set "bankAccountId" = (select id from "BankAccounts" where name like '%관천%' limit 1)
where "bldId" in (select id from "Buildings" where address like '%송파%');

-- 4) 확인: 몇 건이 이 통장으로 잡혔는지
select count(*) from "Ledger"
where "bankAccountId" = (select id from "BankAccounts" where name like '%관천%' limit 1);
