-- =====================================================================
-- 카테고리 = 요약표로 통일 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 지금까지: Ledger.category(텍스트)로 "카테고리별 합계"를 자동 계산 +
--           LedgerReports(수동 저장)를 완전히 별개로 운영.
-- 바뀌는 것: 내역이 요약표(LedgerReports)를 직접 가리키게(reportId) 한다.
--           카테고리를 고르는 것 = 그 요약표에 넣는 것이 되어 두 기능이 하나로 합쳐진다.
--           (이름이 같은 요약표가 두 개 생기는 걸 막기 위해 건물별로 제목도 유일하게 만든다)
-- =====================================================================

-- ledgerCategory.sql을 안 돌렸거나 예전 버전(LedgerTemplates엔 category가 없던 버전)을
-- 돌린 경우에도 아래 마이그레이션이 안전하게 동작하도록 category 컬럼을 여기서도 보장해둔다.
alter table "Ledger" add column if not exists "category" text;
alter table "LedgerTemplates" add column if not exists "category" text;

alter table "Ledger" add column if not exists "reportId" bigint references "LedgerReports"(id) on delete set null;
alter table "LedgerTemplates" add column if not exists "reportId" bigint references "LedgerReports"(id) on delete set null;

create index if not exists "Ledger_reportId_idx" on "Ledger" ("reportId");
create index if not exists "LedgerTemplates_reportId_idx" on "LedgerTemplates" ("reportId");

create unique index if not exists "LedgerReports_bldId_title_idx" on "LedgerReports" ("bldId", "title");

-- 기존에 category(텍스트)로 넣어뒀던 값들을, 같은 이름의 요약표를 만들어(또는 이미 있으면 재사용해서)
-- 그대로 연결해준다. 이미 처리된(reportId가 채워진) 행은 다시 건드리지 않는다.
do $$
declare
	rec record;
	rid bigint;
begin
	for rec in
		select distinct "bldId", "category" from "Ledger" where "category" is not null and "reportId" is null
	loop
		insert into "LedgerReports" ("bldId", "title")
		values (rec."bldId", rec."category")
		on conflict ("bldId", "title") do nothing;

		select id into rid from "LedgerReports" where "bldId" = rec."bldId" and "title" = rec."category";

		update "Ledger" set "reportId" = rid
		where "bldId" = rec."bldId" and "category" = rec."category" and "reportId" is null;
	end loop;

	for rec in
		select distinct "bldId", "category" from "LedgerTemplates" where "category" is not null and "reportId" is null
	loop
		insert into "LedgerReports" ("bldId", "title")
		values (rec."bldId", rec."category")
		on conflict ("bldId", "title") do nothing;

		select id into rid from "LedgerReports" where "bldId" = rec."bldId" and "title" = rec."category";

		update "LedgerTemplates" set "reportId" = rid
		where "bldId" = rec."bldId" and "category" = rec."category" and "reportId" is null;
	end loop;
end $$;

-- category 컬럼은 이제 안 쓴다. 혹시 몰라 지금 당장 지우지는 않고 남겨둔다(원하면 나중에 drop).
