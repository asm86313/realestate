-- =====================================================================
-- 내역별 "이자 매일 자동 계산" 체크박스 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 체크된 내역은 저장된 interestAmount/borrowedDays를 안 믿고, 볼 때마다(요약표를 열 때마다)
-- "오늘 - 날짜" 기준으로 이자를 새로 계산해서 보여준다 - 그래서 매일 값이 자동으로 바뀐다.
-- 체크 안 된 내역(예: 이미 지급 완료된 "1차/2차/3차 이자 출금")은 저장된 값 그대로 고정.
-- =====================================================================

alter table "Ledger" add column if not exists "interestAuto" boolean not null default false;
alter table "LedgerTemplates" add column if not exists "interestAuto" boolean not null default false;
