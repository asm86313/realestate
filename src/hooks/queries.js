'use client';

import { useQuery } from '@tanstack/react-query';
import { getBldInfo, getSchedule, getLedger, getLedgerByDate, getScheduleTemplates, getLedgerTemplates } from '@/utils/core';

// 로딩 중에도 data가 매 렌더마다 새 배열/객체로 바뀌지 않도록 참조를 고정해둔다.
// (그렇지 않으면 이 값을 참조하는 useEffect가 렌더마다 새로 트리거되어
//  "Maximum update depth exceeded" 무한 루프로 이어질 수 있다.)
const EMPTY_BLD_INFO = { Buildings: [], Contracts: [] };
const EMPTY_SCHEDULE = [];
const EMPTY_LEDGER = [];
const EMPTY_TEMPLATES = [];

// 건물리스트 + 계약 목록 (같은 API에서 함께 내려온다)
export function useBldInfoQuery() {
	return useQuery({
		queryKey: ['bldInfo'],
		queryFn: async () => {
			const res = await getBldInfo();
			return res?.data ?? EMPTY_BLD_INFO;
		},
		initialData: EMPTY_BLD_INFO,
	});
}

// 일정 목록
export function useScheduleQuery() {
	return useQuery({
		queryKey: ['schedule'],
		queryFn: async () => {
			const res = await getSchedule();
			return res?.data?.Schedule ?? EMPTY_SCHEDULE;
		},
		initialData: EMPTY_SCHEDULE,
	});
}

// 특정 건물의 입출금 장부
export function useLedgerQuery(bldId) {
	return useQuery({
		queryKey: ['ledger', bldId],
		queryFn: async () => {
			const res = await getLedger(bldId);
			return res?.data?.ledger ?? EMPTY_LEDGER;
		},
		initialData: EMPTY_LEDGER,
		enabled: !!bldId,
	});
}

// 특정 날짜(전체 건물)의 입출금 장부 - 대시보드의 "금일 회계내역"용
export function useLedgerByDateQuery(dateStr) {
	return useQuery({
		queryKey: ['ledger', 'date', dateStr],
		queryFn: async () => {
			const res = await getLedgerByDate(dateStr);
			return res?.data?.ledger ?? EMPTY_LEDGER;
		},
		initialData: EMPTY_LEDGER,
		enabled: !!dateStr,
	});
}

// 반복 일정 템플릿 목록
export function useScheduleTemplatesQuery() {
	return useQuery({
		queryKey: ['scheduleTemplates'],
		queryFn: async () => {
			const res = await getScheduleTemplates();
			return res?.data?.templates ?? EMPTY_TEMPLATES;
		},
		initialData: EMPTY_TEMPLATES,
	});
}

// 반복 장부 템플릿 목록
export function useLedgerTemplatesQuery() {
	return useQuery({
		queryKey: ['ledgerTemplates'],
		queryFn: async () => {
			const res = await getLedgerTemplates();
			return res?.data?.templates ?? EMPTY_TEMPLATES;
		},
		initialData: EMPTY_TEMPLATES,
	});
}
