'use client'; // 클라이언트 컴포넌트임을 선언

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// 역할(role)이 아직 없는 계정을 만나면 보정한다.
// - 가족코드 계정(user_metadata.code가 있음)은 항상 'member'
// - 그 외(이메일로 직접 로그인한 계정)는 'owner'
// 예전에 role 태깅 로직이 생기기 전에 이미 가입/로그인한 계정을 위한 자동 마이그레이션.
async function ensureRole(user) {
  if (!user || user.user_metadata?.role) return user;

  const role = user.user_metadata?.code ? 'member' : 'owner';
  const { data, error } = await supabase.auth.updateUser({ data: { role } });

  return error ? user : data.user;
}

export default function ClientLayout({ children }) {
  // 컴포넌트 인스턴스마다 한 번만 생성되도록 useState로 고정
  // staleTime 기본값(0)이면 같은 화면을 다시 마운트할 때마다(탭 이동, 뒤로가기 등)
  // 캐시가 있어도 즉시 재요청을 날린다. 30초 이내 재방문은 캐시를 그대로 쓰게 해서
  // 체감 속도를 올린다 - 데이터를 바꾸는 동작(등록/수정/삭제)은 각 화면에서
  // invalidateQueries를 호출해 캐시를 무효화하므로 최신성에는 영향 없다.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
          },
        },
      })
  );
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const authChecked = useAuthStore((state) => state.authChecked);

  // 가족 구성원 중 누군가 건물/일정/장부를 바꾸면 내 화면도 실시간으로 갱신되게 한다.
  // (staleTime 30초를 넣어서 화면 재방문 시 재요청을 아끼는 대신, 다른 사람의
  //  변경사항을 놓치지 않도록 Realtime으로 보완한다 - supabase/realtime.sql 참고)
  useRealtimeSync(!!user, queryClient);

  // 앱 전역에서 Supabase 로그인 세션을 useAuthStore와 동기화한다.
  // (새로고침 시 세션 복원 + 로그인/로그아웃 상태변화 실시간 반영)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = await ensureRole(data.session?.user ?? null);
      useAuthStore.getState().setUser(user);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = await ensureRole(session?.user ?? null);
      useAuthStore.getState().setUser(user);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // 로그인 안 된 사용자는 로그인 화면(설정 > 계정관리)으로 보낸다.
  // 실제 데이터 차단은 API 라우트(src/lib/apiAuth.js)에서 하고, 이건 빈 화면을 보지 않게 하는 UX 보조 장치다.
  useEffect(() => {
    if (!authChecked) return;
    if (!user && !pathname.startsWith('/settings')) {
      router.replace('/settings/account');
    }
  }, [authChecked, user, pathname, router]);

  if (authChecked && !user && !pathname.startsWith('/settings')) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
