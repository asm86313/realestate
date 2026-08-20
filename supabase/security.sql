-- =====================================================================
-- 보안 강화 마이그레이션 (한 번만 실행)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 무엇을 고치는가:
--  1) 가족 소속 정보를 user_metadata → 서버 전용 FamilyMembers 테이블로 이전.
--     user_metadata는 사용자가 updateUser()로 직접 고칠 수 있어서,
--     familyOwnerId에 남의 UID를 써넣으면 그 가족 데이터가 열렸다.
--  2) 모든 테이블에 RLS를 켜서 anon 키 직접 접근을 차단.
--     anon 키는 브라우저 번들에 그대로 노출되는 공개 값이라,
--     RLS가 없으면 누구나 앱을 우회해 DB를 읽고/고치고/지울 수 있었다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) 가족 소속 테이블
-- ---------------------------------------------------------------------
-- 어떤 계정이 어느 가족(대표)에 속하는지 기록한다.
-- 여기에 행이 없으면 그 계정 자신이 대표다.
-- service_role(서버)로만 접근 가능하므로 사용자가 위조할 수 없다.
create table if not exists "FamilyMembers" (
  "userId" uuid primary key references auth.users(id) on delete cascade,
  "ownerId" uuid not null,
  "createdAt" timestamp default now()
);

create index if not exists "FamilyMembers_ownerId_idx" on "FamilyMembers" ("ownerId");

-- 기존 계정 이전: user_metadata.familyOwnerId에 있던 소속을 그대로 옮긴다.
-- (이 값이 없는 계정 = 가족대표이므로 옮길 것이 없다)
insert into "FamilyMembers" ("userId", "ownerId")
select id, (raw_user_meta_data ->> 'familyOwnerId')::uuid
from auth.users
where coalesce(raw_user_meta_data ->> 'familyOwnerId', '') <> ''
on conflict ("userId") do nothing;

-- ---------------------------------------------------------------------
-- 2) RLS 활성화
-- ---------------------------------------------------------------------
-- 정책(policy)을 하나도 만들지 않으면 anon / authenticated 롤은 전부 거부된다.
-- 앱 서버(API 라우트)는 service_role 키를 쓰고 이 롤은 RLS를 우회하므로,
-- 앱 기능은 그대로 동작하고 외부 직접 접근만 막힌다.
-- 데이터 격리는 계속 API 라우트의 ownerId 필터가 담당한다.
alter table "Buildings"         enable row level security;
alter table "Contracts"         enable row level security;
alter table "Schedule"          enable row level security;
alter table "Ledger"            enable row level security;
alter table "ScheduleTemplates" enable row level security;
alter table "LedgerTemplates"   enable row level security;
alter table "PushSubscriptions" enable row level security;
alter table "InviteCodes"       enable row level security;
alter table "FamilyMembers"     enable row level security;

-- ---------------------------------------------------------------------
-- 3) 확인
-- ---------------------------------------------------------------------
-- rowsecurity가 전부 true여야 한다.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
