'use client';

import { useQuery } from '@tanstack/react-query';
import { getBldInfo, getSchedule, getLedger, getLedgerByDate, getLedgerReports, getBankAccounts, getScheduleTemplates, getLedgerTemplates } from '@/utils/core';

// 로딩 중에도 data가 매 렌더마다 새 배열/객체로 바뀌지 않도록 참조를 고정해둔다.
// (그렇지 않으면 이 값을 참조하는 useEffect가 렌더마다 새로 트리거되어
//  "Maximum update depth exceeded" 무한 루프로 이어질 수 있다.)
const EMPTY_BLD_INFO = { Buildings: [], Contracts: [] };
const EMPTY_SCHEDULE = [];
const EMPTY_LEDGER = [];
const EMPTY_TEMPLATES = [];
const EMPTY_LEDGER_REPORTS = [];
const EMPTY_BANK_ACCOUNTS = [];

// QueryClient 기본 staleTime(30초, layout.js)이 이 initialData placeholder에도
// 그대로 적용되면, 처음 페이지에 들어왔을 때도 "30초간 신선한 데이터"로 오인해서
// 실제 fetch를 건너뛰어버린다(빈 목록만 보이고 API 호출 자체가 안 나감).
// initialDataUpdatedAt을 0(아주 오래 전)으로 못박아서 이 placeholder는 항상
// 처음부터 stale로 취급되게 한다 - 진짜로 fetch해온 데이터에는 영향 없다.
const INITIAL_DATA_UPDATED_AT = 0;

// 건물리스트 + 계약 목록 (같은 API에서 함께 내려온다)
export function useBldInfoQuery() {
	return useQuery({
		queryKey: ['bldInfo'],
		queryFn: async () => {
			const res = await getBldInfo();
			return res?.data ?? EMPTY_BLD_INFO;
		},
		initialData: EMPTY_BLD_INFO,
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
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
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
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
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
		enabled: !!bldId,
	});
}

// 특정 건물의 저장된 커스텀 회계 요약표 목록
export function useLedgerReportsQuery(bldId) {
	return useQuery({
		queryKey: ['ledgerReports', bldId],
		queryFn: async () => {
			const res = await getLedgerReports(bldId);
			return res?.data?.reports ?? EMPTY_LEDGER_REPORTS;
		},
		initialData: EMPTY_LEDGER_REPORTS,
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
		enabled: !!bldId,
	});
}

// 건물별 통장 목록 (카테고리/요약표와 같은 단위)
export function useBankAccountsQuery(bldId) {
	return useQuery({
		queryKey: ['bankAccounts', bldId],
		queryFn: async () => {
			const res = await getBankAccounts(bldId);
			return res?.data?.accounts ?? EMPTY_BANK_ACCOUNTS;
		},
		initialData: EMPTY_BANK_ACCOUNTS,
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
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
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
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
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
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
		initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
	});
}
