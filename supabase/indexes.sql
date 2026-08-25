-- =====================================================================
-- 조회 성능 개선: 자주 필터링하는 컬럼에 인덱스 추가 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 왜 필요한가:
--  Postgres는 foreign key를 걸어도 참조 컬럼(bldId 등)에 자동으로
--  인덱스를 만들어주지 않는다. 지금 스키마엔 FamilyMembers_ownerId_idx
--  하나만 있어서, API 라우트에서 매번 걸어주는 ownerId/bldId 필터가
--  전부 풀스캔으로 처리되고 있었다. 데이터가 늘수록 체감 지연이 커진다.
-- =====================================================================

-- 소유자(가족) 단위 조회 — 거의 모든 API 라우트가 이 필터를 쓴다
create index if not exists "Buildings_ownerId_idx"         on "Buildings" ("ownerId");
create index if not exists "Schedule_ownerId_idx"           on "Schedule" ("ownerId");
create index if not exists "ScheduleTemplates_ownerId_idx"  on "ScheduleTemplates" ("ownerId");
create index if not exists "LedgerTemplates_ownerId_idx"    on "LedgerTemplates" ("ownerId");
create index if not exists "PushSubscriptions_ownerId_idx"  on "PushSubscriptions" ("ownerId");
create index if not exists "InviteCodes_ownerId_idx"        on "InviteCodes" ("ownerId");

-- 건물 단위 조회/조인 — getbldinfo(Contracts), ledger(Ledger + Buildings 조인)에서 사용
create index if not exists "Contracts_bldId_idx"            on "Contracts" ("bldId");
create index if not exists "Ledger_bldId_idx"                on "Ledger" ("bldId");
create index if not exists "ScheduleTemplates_bldId_idx"    on "ScheduleTemplates" ("bldId");
create index if not exists "LedgerTemplates_bldId_idx"      on "LedgerTemplates" ("bldId");

-- ---------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------
select tablename, indexname
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
