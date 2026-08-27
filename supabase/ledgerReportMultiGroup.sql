-- =====================================================================
-- 요약표(LedgerReports)가 그룹 하나가 아니라 여러 그룹에 동시에 속할 수 있도록 변경 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 지금까지: LedgerReports.groupName(단일 텍스트) - 요약표 하나는 그룹 하나에만 속함.
-- 바뀌는 것: LedgerReports.groupNames(텍스트 배열) - 요약표 하나가 그룹 여러 개에 속할 수 있음.
-- 기존 groupName 값은 그대로 배열의 첫 항목으로 옮겨준다(데이터 안 날아감).
-- groupName 컬럼은 당장 지우지 않고 남겨둔다(혹시 몰라서) - 이제 앱은 안 쓴다.
-- =====================================================================

alter table "LedgerReports" add column if not exists "groupNames" text[] not null default '{}';

update "LedgerReports"
set "groupNames" = array["groupName"]
where "groupName" is not null and "groupName" <> '' and coalesce(array_length("groupNames", 1), 0) = 0;
