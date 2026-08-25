-- =====================================================================
-- 요약표(카테고리)를 더 큰 그룹으로 묶기 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 예: "은행이자", "개인이자" 요약표를 "이자비용"이라는 그룹으로 묶어서,
-- 회계 > 저장된 요약표 목록에서 그룹 합계와 함께 모아 보여준다.
-- title처럼 유일할 필요는 없다 - 여러 요약표가 같은 그룹명을 자유롭게 공유한다.
-- =====================================================================

alter table "LedgerReports" add column if not exists "groupName" text;

create index if not exists "LedgerReports_bldId_groupName_idx" on "LedgerReports" ("bldId", "groupName");
