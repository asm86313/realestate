'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 테이블에 변경이 생기면 어떤 React Query 캐시를 무효화할지 매핑.
// (queryKey는 prefix로 매칭되므로 'ledger'만 줘도 ['ledger', bldId], ['ledger', 'date', d] 둘 다 걸린다)
const TABLE_QUERY_KEYS = {
	Buildings: ['bldInfo'],
	Contracts: ['bldInfo'],
	Schedule: ['schedule'],
	Ledger: ['ledger'],
	ScheduleTemplates: ['scheduleTemplates'],
	LedgerTemplates: ['ledgerTemplates'],
};

// 가족 구성원이 여러 명일 때, 다른 사람이 건물/일정/장부를 추가·수정·삭제하면
// 내 화면도 자동으로 갱신되도록 Supabase Realtime을 구독한다.
//
// 필터를 안 걸어도 안전하다: Buildings/Schedule/... 테이블에는
// supabase/realtime.sql에서 "내 가족(ownerId) 데이터만" 보이는 RLS SELECT
// 정책을 걸어뒀고, Realtime은 그 RLS를 통과한 이벤트만 클라이언트로 보내주기
// 때문이다. 즉 다른 가족의 변경사항은 애초에 이벤트 자체가 오지 않는다.
//
// enabled: 로그인 상태일 때만 구독한다 (로그인 전엔 어차피 RLS가 다 막는다).
// queryClient: ClientLayout이 QueryClientProvider보다 바깥(같은 컴포넌트)에서
// 이 훅을 호출하기 때문에 useQueryClient()로는 컨텍스트를 못 읽는다.
// 이미 만들어둔 queryClient 인스턴스를 그대로 받아서 쓴다.
export function useRealtimeSync(enabled, queryClient) {
	useEffect(() => {
		if (!enabled) return;

		const channel = supabase.channel('family-data-sync');

		Object.entries(TABLE_QUERY_KEYS).forEach(([table, queryKey]) => {
			channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
				queryClient.invalidateQueries({ queryKey });
			});
		});

		channel.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [enabled, queryClient]);
}
