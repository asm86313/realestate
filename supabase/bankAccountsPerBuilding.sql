-- =====================================================================
-- 통장을 가족(ownerId) 단위 → 건물(bldId) 단위로 변경 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 카테고리(요약표)와 같은 방식으로: 통장도 건물마다 따로 관리한다.
-- =====================================================================

alter table "BankAccounts" add column if not exists "bldId" bigint references "Buildings"(id) on delete cascade;

-- 기존 통장은, 그 통장을 쓰고 있던 내역이 속한 건물로 옮겨준다.
-- (여러 건물 내역이 같은 통장을 쓰고 있었다면 그중 하나로 배정되고,
--  다른 건물 내역들은 이 UPDATE 이후 알아서 통장 연결이 안 맞게 되니
--  필요하면 손으로 다시 지정해야 한다 - 지금 데이터엔 건물이 하나뿐이라 해당 없음)
update "BankAccounts" a
set "bldId" = (
	select l."bldId" from "Ledger" l where l."bankAccountId" = a.id limit 1
)
where a."bldId" is null;

-- 어떤 내역에서도 아직 안 쓰인 통장(방금 만들었지만 내역엔 아직 안 붙인 경우 등)은
-- 건물이 하나뿐일 때만 그 건물로 자동 배정한다. 건물이 여러 개면 알 수가 없어서 손으로 지정해야 한다.
update "BankAccounts" a
set "bldId" = (select id from "Buildings" limit 1)
where a."bldId" is null
	and (select count(*) from "Buildings") = 1;

-- 예전 "가족 단위 유일" 제약을 지우고, "건물 단위 유일"로 바꾼다.
drop index if exists "BankAccounts_ownerId_name_idx";
create unique index if not exists "BankAccounts_bldId_name_idx" on "BankAccounts" ("bldId", "name");

create index if not exists "BankAccounts_bldId_idx" on "BankAccounts" ("bldId");

-- 혹시 위 두 UPDATE로도 bldId가 안 채워진 통장이 있는지 확인 (있으면 손으로 지정해줘야 함)
select id, name, "ownerId" from "BankAccounts" where "bldId" is null;
