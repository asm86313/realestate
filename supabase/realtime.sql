-- =====================================================================
-- Realtime 활성화: 가족 단위 "읽기" RLS 정책 추가 + 테이블을 Realtime에 등록
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
--
-- 배경: security.sql에서 모든 테이블에 RLS를 켜고 authenticated/anon 롤에는
-- 정책을 하나도 안 만들어서, 브라우저(anon key)로는 전부 거부되고 서버
-- (service_role, RLS 우회)만 접근 가능한 구조로 만들어뒀다. 그런데 Supabase
-- Realtime은 RLS를 통과한 행만 클라이언트에 push하기 때문에, 이 상태로는
-- 브라우저가 구독을 걸어도 이벤트가 하나도 오지 않는다.
--
-- 그래서 "내 가족 데이터만 읽기" 허용하는 SELECT 정책을 authenticated 롤에
-- 추가한다. INSERT/UPDATE/DELETE는 계속 막아둔다 - 쓰기는 지금처럼 반드시
-- 서버 API(service_role)를 거치게 해서, 지금까지의 보안 모델(브라우저는
-- 절대 직접 쓰지 못한다)은 그대로 유지한다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) 현재 로그인한 사용자의 가족 대표(ownerId)를 돌려주는 헬퍼 함수
-- ---------------------------------------------------------------------
-- FamilyMembers 자체도 RLS로 막혀 있어서(authenticated 정책 없음), 아래처럼
-- 정책 안에서 FamilyMembers를 그냥 조회하면 재귀적으로 막혀버린다.
-- SECURITY DEFINER로 만들어 이 함수 안에서는 RLS를 우회해 조회하게 한다.
-- (postgres 소유 함수라 이 함수를 실행하는 동안에는 FamilyMembers의 RLS를
--  건너뛴다 - Supabase의 표준 "RLS 재귀 회피" 패턴이다.)
create or replace function public.current_family_owner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select "ownerId" from "FamilyMembers" where "userId" = auth.uid()),
    auth.uid()
  );
$$;

-- 아무나(anon 포함) 실행 못 하게 기본 권한을 걷어내고, 로그인한 사용자에게만 허용
revoke all on function public.current_family_owner_id() from public;
grant execute on function public.current_family_owner_id() to authenticated;

-- ---------------------------------------------------------------------
-- 2) 가족 단위 읽기 정책 (SELECT만, 쓰기는 계속 서버 전용)
-- ---------------------------------------------------------------------
drop policy if exists "family can read own buildings" on "Buildings";
create policy "family can read own buildings" on "Buildings"
  for select to authenticated
  using ("ownerId" = public.current_family_owner_id());

drop policy if exists "family can read own schedule" on "Schedule";
create policy "family can read own schedule" on "Schedule"
  for select to authenticated
  using ("ownerId" = public.current_family_owner_id());

drop policy if exists "family can read own scheduletemplates" on "ScheduleTemplates";
create policy "family can read own scheduletemplates" on "ScheduleTemplates"
  for select to authenticated
  using ("ownerId" = public.current_family_owner_id());

drop policy if exists "family can read own ledgertemplates" on "LedgerTemplates";
create policy "family can read own ledgertemplates" on "LedgerTemplates"
  for select to authenticated
  using ("ownerId" = public.current_family_owner_id());

-- Contracts/Ledger는 ownerId 컬럼이 없어서 bldId로 Buildings를 거쳐 확인한다.
drop policy if exists "family can read own contracts" on "Contracts";
create policy "family can read own contracts" on "Contracts"
  for select to authenticated
  using (
    exists (
      select 1 from "Buildings" b
      where b.id = "Contracts"."bldId"
        and b."ownerId" = public.current_family_owner_id()
    )
  );

drop policy if exists "family can read own ledger" on "Ledger";
create policy "family can read own ledger" on "Ledger"
  for select to authenticated
  using (
    exists (
      select 1 from "Buildings" b
      where b.id = "Ledger"."bldId"
        and b."ownerId" = public.current_family_owner_id()
    )
  );

-- ---------------------------------------------------------------------
-- 3) 이 테이블들의 변경사항을 Realtime으로 내보내도록 등록
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['Buildings', 'Contracts', 'Schedule', 'Ledger', 'ScheduleTemplates', 'LedgerTemplates'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
