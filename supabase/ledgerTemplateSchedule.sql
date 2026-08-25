-- =====================================================================
-- 반복 장부 템플릿에 시작월/끝월/반복 주기 추가 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- - startMonth/endMonth('YYYY-MM'): 이 범위 밖의 달에는 생성 안 함. 둘 다 비워두면 무기한.
-- - intervalMonths: 매월(1)이 아니라 N개월마다 생성하고 싶을 때. 이때는 startMonth를
--   기준(anchor)으로 몇 개월째인지 세서 나머지가 0인 달에만 생성한다.
-- =====================================================================

alter table "LedgerTemplates" add column if not exists "startMonth" text;
alter table "LedgerTemplates" add column if not exists "endMonth" text;
alter table "LedgerTemplates" add column if not exists "intervalMonths" integer not null default 1;
