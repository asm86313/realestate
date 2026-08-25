-- =====================================================================
-- 회계 내역에 "카테고리" 추가 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 내역을 등록/수정할 때 카테고리(예: "총 비용")를 붙여두면, 회계 > 전체
-- 탭에서 같은 카테고리끼리 자동으로 합산되는 요약이 뜬다. 지난번 만든
-- LedgerReports(수동으로 골라 저장하는 스냅샷)와 달리 이건 그때그때
-- ledger 데이터에서 바로 계산하는 거라 저장이 필요 없고, 내역을
-- 추가/수정/삭제하면 즉시 반영된다.
-- =====================================================================

alter table "Ledger" add column if not exists "category" text;

-- bldId+category로 묶어 조회하는 경우가 많아질 걸 대비해 인덱스도 같이.
create index if not exists "Ledger_bldId_category_idx" on "Ledger" ("bldId", "category");

-- 반복 장부 템플릿에서 생성되는 내역도 카테고리를 이어받을 수 있도록 템플릿에도 추가.
alter table "LedgerTemplates" add column if not exists "category" text;
