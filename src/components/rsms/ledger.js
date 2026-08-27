'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, CalendarClock, CheckSquare, ChevronLeft, ChevronRight, ClipboardPaste, Download, Landmark, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import koLocale from '@fullcalendar/core/locales/ko';

import { regLedger, delLedger, saveLedgerReport, saveBankAccount } from '@/utils/core';
import { useLedgerQuery, useLedgerReportsQuery, useBankAccountsQuery } from '@/hooks/queries';
import { parseBulkLedgerText } from '@/utils/ledgerImport';
import { downloadLedgerCsv } from '@/utils/ledgerExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const NEW_ACCOUNT_VALUE = '__new__';
const NO_ACCOUNT_VALUE = '__none__';
const ALL_CATEGORY_FILTER = '__all__';
const NO_CATEGORY_FILTER = '__none__';

const numberFmt = new Intl.NumberFormat('ko-KR');

function toWon(n) {
	if (n === null || n === undefined || n === '') return null;
	return numberFmt.format(Number(n));
}

// 빌린일수: 다른 내역은 전혀 안 보고, 이 내역 자체의 날짜 하나만으로 계산한다
// (오늘 - 이 내역의 날짜 = 그 돈이 지금까지 며칠째 나가있는지).
function computeBorrowedDays(date) {
	if (!date) return '';
	return dayjs().startOf('day').diff(dayjs(date).startOf('day'), 'day');
}

// 단리로 이자를 계산한다: 원금 × 이자율(%) × 빌린일수 / 365.
// 원금은 입금/출금 중 채워진 쪽을 쓴다(둘 다 비어있으면 0).
function computeInterestAmount(income, expense, interestRate, borrowedDays) {
	const principal = Number(income || 0) || Number(expense || 0);
	const rate = Number(interestRate || 0);
	const days = Number(borrowedDays || 0);
	if (!principal || !rate || !days) return '';
	return Math.round(principal * (rate / 100) * (days / 365));
}

const initialForm = {
	id: null,
	date: '',
	purpose: '',
	income: '',
	expense: '',
	interestRate: '',
	interestAmount: '',
	borrowedDays: '',
	interestAuto: true,
	notes: '',
	reportIds: [],
	bankAccountId: null,
};

export default function Ledger({ bldId }) {
	const queryClient = useQueryClient();
	const { data: ledger = [] } = useLedgerQuery(bldId);
	const { data: reports = [] } = useLedgerReportsQuery(bldId);
	const { data: accounts = [] } = useBankAccountsQuery(bldId);
	// 통장 탭: null이면 전체, 아니면 그 통장 내역만 이 화면 전체(잔액/달력/목록)에 반영한다.
	const [selectedAccountId, setSelectedAccountId] = useState(null);
	// 카테고리 필터: 목록을 나누지 않고, 대신 이걸로 고른 카테고리 내역만 보여준다.
	const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORY_FILTER);
	// 목록 정렬: 기본은 최신 날짜부터(내림차순). 버튼으로 오래된순과 토글한다.
	const [sortOrder, setSortOrder] = useState('desc');
	const [isAddAccountOpen, setAddAccountOpen] = useState(false);
	const [newAccountName, setNewAccountName] = useState('');
	const [isOpen, setOpen] = useState(false);
	const [form, setForm] = useState(initialForm);
	const [isBulkOpen, setBulkOpen] = useState(false);
	const [bulkText, setBulkText] = useState('');
	const [bulkSubmitting, setBulkSubmitting] = useState(false);
	const [viewMode, setViewMode] = useState('month'); // 'all' | 'month' | 'year'
	const [periodDate, setPeriodDate] = useState(() => dayjs());
	// 월별 보기에서만 쓰는, 달력에서 클릭해 고른 날짜 (일정 캘린더와 같은 방식).
	// null이면 "특정 날짜를 안 골랐다"는 뜻이라 그 달 전체 내역을 보여준다.
	const calendarRef = useRef(null);
	const [selectedDate, setSelectedDate] = useState(null);
	// 카테고리 = 요약표(LedgerReports) 자체를 고르는 것. 내역 하나가 여러 카테고리에 동시에
	// 속할 수 있어서 체크리스트로 여러 개를 고르고, 새 이름을 입력해 그 자리에서 추가할 수도 있다.
	const [newReportTitle, setNewReportTitle] = useState('');
	// 목록에서 여러 내역을 체크해서 카테고리를 한 번에 적용하는 기능.
	const [isSelectMode, setSelectMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	// 일괄 적용은 이제 "덮어쓰기"가 아니라 "추가"다 - 체크한 카테고리들을 선택된 내역들의
	// 기존 카테고리에 더해준다(원래 있던 카테고리는 그대로 남는다). 그래서 여러 개 체크 가능.
	const [bulkReportIds, setBulkReportIds] = useState(() => new Set());
	const [bulkNewReportTitle, setBulkNewReportTitle] = useState('');
	const [bulkApplying, setBulkApplying] = useState(false);

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['ledger', bldId] });
	}, [queryClient, bldId]);

	const setField = useCallback((key) => (e) => {
		setForm((prev) => ({ ...prev, [key]: e.target.value }));
	}, []);

	const [isNewAccount, setNewAccount] = useState(false);
	const [newAccountTitle, setNewAccountTitle] = useState('');

	const onAdd = useCallback(() => {
		// 지금 특정 카테고리로 필터링해서 보고 있었으면, 새 내역도 그 카테고리로 미리 체크해준다.
		const prefilledReportIds =
			categoryFilter !== ALL_CATEGORY_FILTER && categoryFilter !== NO_CATEGORY_FILTER ? [Number(categoryFilter)] : [];
		setForm({ ...initialForm, bankAccountId: selectedAccountId, reportIds: prefilledReportIds });
		setNewReportTitle('');
		setNewAccount(false);
		setNewAccountTitle('');
		setOpen(true);
	}, [selectedAccountId, categoryFilter]);

	const onEditRow = useCallback((row) => {
		setForm({
			id: row.id,
			date: row.date || '',
			purpose: row.purpose || '',
			income: row.income ?? '',
			expense: row.expense ?? '',
			interestRate: row.interestRate ?? '',
			interestAmount: row.interestAmount ?? '',
			borrowedDays: row.borrowedDays ?? '',
			interestAuto: row.interestAuto ?? false,
			notes: row.notes || '',
			reportIds: row.reportIds || [],
			bankAccountId: row.bankAccountId ?? null,
		});
		setNewReportTitle('');
		setNewAccount(false);
		setNewAccountTitle('');
		setOpen(true);
	}, []);

	// "이자 매일 자동 계산"이 체크돼있으면: 빌린일수는 오늘 - 이 내역 날짜(다른 내역은 안 봄)로
	// 채우고, 그 빌린일수로 이자까지 이어서 계산해서 폼에 미리 보여준다. 이 체크 여부 자체가
	// 저장돼서, 요약표에서도 매번 오늘 날짜 기준으로 다시 계산되게 한다 (utils/ledgerAmount.js).
	useEffect(() => {
		if (!form.interestAuto) return;
		setForm((prev) => {
			const borrowedDays = computeBorrowedDays(prev.date);
			return {
				...prev,
				borrowedDays,
				interestAmount: computeInterestAmount(prev.income, prev.expense, prev.interestRate, borrowedDays),
			};
		});
	}, [form.interestAuto, form.date, form.income, form.expense, form.interestRate]);

	// 카테고리는 이제 여러 개를 동시에 체크할 수 있다 - 목록에서 하나씩 켜고 끈다.
	const toggleFormReport = useCallback((id) => {
		setForm((prev) => {
			const set = new Set(prev.reportIds);
			if (set.has(id)) set.delete(id);
			else set.add(id);
			return { ...prev, reportIds: Array.from(set) };
		});
	}, []);

	// "+ 새 카테고리 추가"는 저장을 미루지 않고 바로 요약표를 만들어서(같은 이름 있으면 재사용)
	// 그 자리에서 체크해준다 - 여러 카테고리를 골라야 해서 저장 시점까지 미루면 하나만 만들 수 있다.
	const onAddNewReportToForm = useCallback(async () => {
		if (!newReportTitle.trim()) {
			toast.warning('새 카테고리 이름을 입력해주세요.');
			return;
		}
		const reportRes = await saveLedgerReport({ bldId, title: newReportTitle.trim(), items: [] });
		if (!reportRes) {
			toast.error('카테고리 생성에 실패했습니다.');
			return;
		}
		const newId = reportRes.data?.id ?? null;
		queryClient.invalidateQueries({ queryKey: ['ledgerReports', bldId] });
		setNewReportTitle('');
		if (newId) {
			setForm((prev) => ({ ...prev, reportIds: Array.from(new Set([...prev.reportIds, newId])) }));
		}
	}, [newReportTitle, bldId, queryClient]);

	const onAccountSelect = useCallback((v) => {
		if (v === NEW_ACCOUNT_VALUE) {
			setNewAccount(true);
			setForm((prev) => ({ ...prev, bankAccountId: null }));
			return;
		}
		setNewAccount(false);
		setForm((prev) => ({ ...prev, bankAccountId: v === NO_ACCOUNT_VALUE ? null : Number(v) }));
	}, []);

	const toggleSelectMode = useCallback(() => {
		setSelectMode((prev) => !prev);
		setSelectedIds(new Set());
		setBulkReportIds(new Set());
		setBulkNewReportTitle('');
	}, []);

	const toggleRowSelected = useCallback((id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const toggleBulkReport = useCallback((id) => {
		setBulkReportIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// 일괄 적용 패널에서도 "+ 새 카테고리 추가"는 그 자리에서 바로 만들어서 체크해준다.
	const onAddNewReportToBulk = useCallback(async () => {
		if (!bulkNewReportTitle.trim()) {
			toast.warning('새 카테고리 이름을 입력해주세요.');
			return;
		}
		const reportRes = await saveLedgerReport({ bldId, title: bulkNewReportTitle.trim(), items: [] });
		if (!reportRes) {
			toast.error('카테고리 생성에 실패했습니다.');
			return;
		}
		const newId = reportRes.data?.id ?? null;
		queryClient.invalidateQueries({ queryKey: ['ledgerReports', bldId] });
		setBulkNewReportTitle('');
		if (newId) setBulkReportIds((prev) => new Set(prev).add(newId));
	}, [bulkNewReportTitle, bldId, queryClient]);

	// 체크한 내역 전부에 체크한 카테고리들을 한 번에 "추가"한다(기존 카테고리는 유지).
	// 카테고리 필드만 바꾸는 게 아니라, 각 내역의 다른 값(날짜/금액/통장 등)은 그대로 실어서
	// 다시 저장한다 - regLedger가 매번 행 전체를 덮어쓰는 방식이라, 값을 안 실으면 지워진다.
	const onApplyBulkCategory = useCallback(async () => {
		if (selectedIds.size === 0) {
			toast.warning('먼저 내역을 선택해주세요.');
			return;
		}
		if (bulkReportIds.size === 0) {
			toast.warning('적용할 카테고리를 선택해주세요.');
			return;
		}

		setBulkApplying(true);
		try {
			const targets = ledger.filter((row) => selectedIds.has(row.id));
			const results = await Promise.all(
				targets.map((row) =>
					regLedger({
						id: row.id,
						bldId: row.bldId,
						date: row.date,
						purpose: row.purpose,
						income: row.income,
						expense: row.expense,
						interestRate: row.interestRate,
						interestAmount: row.interestAmount,
						borrowedDays: row.borrowedDays,
						interestAuto: row.interestAuto,
						notes: row.notes,
						reportIds: Array.from(new Set([...(row.reportIds || []), ...bulkReportIds])),
						bankAccountId: row.bankAccountId,
					})
				)
			);
			const failCount = results.filter((r) => !r).length;
			if (failCount > 0) {
				toast.warning(`${targets.length - failCount}건 적용, ${failCount}건 실패했습니다.`);
			} else {
				toast.success(`${targets.length}건에 카테고리를 적용했습니다.`);
			}
			toggleSelectMode();
			invalidate();
		} finally {
			setBulkApplying(false);
		}
	}, [selectedIds, bulkReportIds, ledger, invalidate, toggleSelectMode]);

	const onClose = useCallback(() => {
		setOpen(false);
	}, []);

	const onSave = useCallback(async () => {
		let bankAccountId = form.bankAccountId;

		// "새 통장 추가"를 골랐으면 저장 전에 그 통장부터 만든다 (같은 이름 있으면 서버가 재사용).
		if (isNewAccount) {
			if (!newAccountTitle.trim()) {
				toast.warning('새 통장 이름을 입력해주세요.');
				return;
			}
			const accountRes = await saveBankAccount({ bldId, name: newAccountTitle.trim() });
			if (!accountRes) {
				toast.error('통장 생성에 실패했습니다.');
				return;
			}
			bankAccountId = accountRes.data?.id ?? null;
			queryClient.invalidateQueries({ queryKey: ['bankAccounts', bldId] });
		}

		const res = await regLedger({
			id: form.id,
			bldId,
			date: form.date,
			purpose: form.purpose,
			income: form.income === '' ? null : Number(form.income),
			expense: form.expense === '' ? null : Number(form.expense),
			interestRate: form.interestRate === '' ? null : Number(form.interestRate),
			interestAmount: form.interestAmount === '' ? null : Number(form.interestAmount),
			borrowedDays: form.borrowedDays === '' ? null : Number(form.borrowedDays),
			interestAuto: form.interestAuto,
			notes: form.notes,
			reportIds: form.reportIds,
			bankAccountId,
		});

		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}

		toast.success(form.id ? '항목이 수정되었습니다.' : '항목이 등록되었습니다.');
		setOpen(false);
		invalidate();
	}, [form, bldId, invalidate, isNewAccount, newAccountTitle, queryClient]);

	const onDelete = useCallback(async () => {
		const res = await delLedger(form.id);
		if (!res) {
			toast.error('삭제에 실패했습니다.');
			return;
		}
		toast.success('항목이 삭제되었습니다.');
		setOpen(false);
		invalidate();
	}, [form.id, invalidate]);

	const bulkEntries = useMemo(() => parseBulkLedgerText(bulkText), [bulkText]);

	const onBulkImport = useCallback(async () => {
		if (bulkEntries.length === 0) {
			toast.warning('인식된 항목이 없습니다.');
			return;
		}
		setBulkSubmitting(true);
		try {
			// 지금 고른 통장 탭이 있으면, 대량 등록도 "내역 추가"(단건)와 똑같이 그 통장으로 넣는다.
			const results = await Promise.all(
				bulkEntries.map((entry) => regLedger({ ...entry, bldId, bankAccountId: selectedAccountId }))
			);
			const failCount = results.filter((r) => !r).length;

			if (failCount > 0) {
				toast.warning(`${bulkEntries.length - failCount}건 등록, ${failCount}건 실패했습니다.`);
			} else {
				toast.success(`${bulkEntries.length}건 등록되었습니다.`);
			}
			setBulkText('');
			setBulkOpen(false);
			invalidate();
		} finally {
			setBulkSubmitting(false);
		}
	}, [bulkEntries, bldId, invalidate, selectedAccountId]);

	const onAddAccount = useCallback(async () => {
		if (!newAccountName.trim()) {
			toast.warning('통장 이름을 입력해주세요.');
			return;
		}
		const res = await saveBankAccount({ bldId, name: newAccountName.trim() });
		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}
		toast.success('통장이 추가되었습니다.');
		queryClient.invalidateQueries({ queryKey: ['bankAccounts', bldId] });
		setSelectedAccountId(res.data?.id ?? null);
		setNewAccountName('');
		setAddAccountOpen(false);
	}, [newAccountName, queryClient, bldId]);

	// 선택한 통장이 있으면 잔액/달력/목록 전체를 그 통장 내역으로만 좁힌다.
	const accountFilteredLedger = useMemo(
		() => (selectedAccountId ? ledger.filter((row) => row.bankAccountId === selectedAccountId) : ledger),
		[ledger, selectedAccountId]
	);

	const totalIncome = accountFilteredLedger.reduce((sum, row) => sum + Number(row.income || 0), 0);
	const totalExpense = accountFilteredLedger.reduce((sum, row) => sum + Number(row.expense || 0), 0);
	const balance = totalIncome - totalExpense;

	const onPrevPeriod = useCallback(() => {
		setPeriodDate((d) => d.subtract(1, viewMode === 'year' ? 'year' : 'month'));
	}, [viewMode]);

	const onNextPeriod = useCallback(() => {
		setPeriodDate((d) => d.add(1, viewMode === 'year' ? 'year' : 'month'));
	}, [viewMode]);

	const filteredLedger = useMemo(() => {
		if (viewMode === 'all') return accountFilteredLedger;
		const unit = viewMode === 'year' ? 'year' : 'month';
		return accountFilteredLedger.filter((row) => row.date && dayjs(row.date).isSame(periodDate, unit));
	}, [accountFilteredLedger, viewMode, periodDate]);

	const periodLabel = viewMode === 'all'
		? '전체 내역'
		: viewMode === 'year'
			? periodDate.format('YYYY년')
			: periodDate.format('YYYY년 M월');

	const periodIncome = filteredLedger.reduce((sum, row) => sum + Number(row.income || 0), 0);
	const periodExpense = filteredLedger.reduce((sum, row) => sum + Number(row.expense || 0), 0);

	// 월별 보기에서만: 달력이 표시하는 달을 위쪽 "이전/다음" 기간 이동과 맞춰준다.
	// 특정 날짜 선택은 매번 초기화한다 - 달을 옮기면 그 달 전체 내역부터 다시 보여주기 위함.
	useEffect(() => {
		if (viewMode !== 'month') return;
		setSelectedDate(null);
		calendarRef.current?.getApi()?.gotoDate(periodDate.format('YYYY-MM-DD'));
	}, [viewMode, periodDate]);

	// 월별 보기 달력에 찍을 이벤트. dayMaxEvents=0이라 실제로는 안 그려지고
	// "+N" 건수 링크만 뜬다(FullCalendar의 moreLinkContent).
	const calendarEvents = useMemo(
		() => filteredLedger.map((row) => ({ id: String(row.id), title: row.purpose || '내역', start: row.date, allDay: true })),
		[filteredLedger]
	);

	// 같은 날짜를 다시 클릭하면 선택을 풀어서 그 달 전체 내역으로 돌아간다.
	const onCalendarDateClick = useCallback((info) => {
		setSelectedDate((prev) => (prev === info.dateStr ? null : info.dateStr));
	}, []);

	// 월별 보기에서 특정 날짜를 골랐으면 그 날 내역만, 안 골랐으면 그 달 전체 내역을 보여준다.
	// (전체/연도별 보기는 원래부터 기간 전체를 보여준다)
	const displayedLedger = viewMode === 'month' && selectedDate
		? filteredLedger.filter((row) => row.date === selectedDate)
		: filteredLedger;

	const selectedDateLabel = selectedDate ? dayjs(selectedDate).format('M월 D일') : `${periodDate.format('M월')} 전체`;

	// 이 건물에 이미 있는 요약표 = 카테고리 선택지. id -> title 조회용 맵도 같이 만든다.
	const reportTitleById = useMemo(() => new Map(reports.map((r) => [r.id, r.title])), [reports]);
	const accountNameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

	// 카테고리 필터: "카테고리 없음"/특정 카테고리를 고르면 목록을 그걸로만 좁힌다. 안 나누고 뱃지로만 표시.
	// 그 다음 날짜 기준으로 정렬한다 - 기본은 최신순(내림차순), 버튼으로 오래된순과 토글.
	// 날짜가 같으면 등록 순서(id)로 같은 방향으로 묶어서 매번 순서가 흔들리지 않게 한다.
	const visibleLedger = useMemo(() => {
		let rows = displayedLedger;
		if (categoryFilter === NO_CATEGORY_FILTER) {
			rows = rows.filter((row) => (row.reportIds || []).length === 0);
		} else if (categoryFilter !== ALL_CATEGORY_FILTER) {
			const reportId = Number(categoryFilter);
			rows = rows.filter((row) => (row.reportIds || []).includes(reportId));
		}
		const dir = sortOrder === 'desc' ? -1 : 1;
		return rows.slice().sort((a, b) => {
			const dateCmp = (a.date || '').localeCompare(b.date || '');
			if (dateCmp !== 0) return dateCmp * dir;
			return ((a.id || 0) - (b.id || 0)) * dir;
		});
	}, [displayedLedger, categoryFilter, sortOrder]);
	// 지금 화면에 보이는 목록(전체/연도별/월별 + 통장/카테고리 필터가 적용된 상태) 그대로 CSV로 내려받는다.
	const onExportCsv = useCallback(() => {
		if (visibleLedger.length === 0) {
			toast.warning('내려받을 내역이 없습니다.');
			return;
		}
		const accountLabel = selectedAccountId ? accountNameById.get(selectedAccountId) || '통장' : '전체통장';
		const periodPart = viewMode === 'month' && selectedDate ? selectedDate : periodLabel;
		downloadLedgerCsv(
			visibleLedger,
			{ reportTitleById, accountNameById },
			`장부_${accountLabel}_${periodPart}.csv`
		);
	}, [visibleLedger, reportTitleById, accountNameById, selectedAccountId, viewMode, selectedDate, periodLabel]);

	const renderLedgerRow = (row) => (
		<div
			key={row.id}
			className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-accent active:bg-accent"
			onClick={() => (isSelectMode ? toggleRowSelected(row.id) : onEditRow(row))}
		>
			{isSelectMode && (
				// 체크박스 자체 클릭도 위 div의 onClick으로 버블링돼서 두 번 토글되던 걸 막는다
				// (체크박스 따로 안 눌러도 행 아무 데나 눌러도 선택되게 하기 위한 처리).
				<div onClick={(e) => e.stopPropagation()} className="shrink-0">
					<Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleRowSelected(row.id)} />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-medium">{row.purpose || '(내용 없음)'}</p>
					{(row.reportIds || []).map((id) =>
						reportTitleById.get(id) ? (
							<span key={id} className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
								{reportTitleById.get(id)}
							</span>
						) : null
					)}
					{row.bankAccountId && accountNameById.get(row.bankAccountId) && (
						<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
							{accountNameById.get(row.bankAccountId)}
						</span>
					)}
				</div>
				<p className="text-xs text-muted-foreground">{row.date}</p>
				{row.notes && <p className="truncate text-xs text-muted-foreground">{row.notes}</p>}
			</div>
			<div className="shrink-0 text-right text-sm font-semibold">
				{row.expense ? (
					<p className="text-destructive">-{toWon(row.expense)}</p>
				) : row.income ? (
					<p className="text-primary">+{toWon(row.income)}</p>
				) : null}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-1.5">
				<Button
					type="button"
					variant={selectedAccountId === null ? 'default' : 'outline'}
					size="sm"
					onClick={() => setSelectedAccountId(null)}
				>
					전체
				</Button>
				{accounts.map((a) => (
					<Button
						key={a.id}
						type="button"
						variant={selectedAccountId === a.id ? 'default' : 'outline'}
						size="sm"
						className="gap-1.5"
						onClick={() => setSelectedAccountId(a.id)}
					>
						<Landmark className="size-3.5" /> {a.name}
					</Button>
				))}
				<Button type="button" variant="ghost" size="icon" onClick={() => setAddAccountOpen(true)}>
					<Plus className="size-4" />
				</Button>
			</div>

			<Card>
				<CardContent className="flex flex-col gap-3 p-4 sm:p-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Wallet className="size-4" /> 잔액{selectedAccountId && accountNameById.get(selectedAccountId) ? ` · ${accountNameById.get(selectedAccountId)}` : ''}
					</div>
					<p className="text-2xl font-bold tracking-tight">{toWon(balance)}원</p>
					<div className="flex gap-4 text-sm">
						<span className="text-primary">입금 {toWon(totalIncome)}원</span>
						<span className="text-destructive">출금 {toWon(totalExpense)}원</span>
					</div>
				</CardContent>
			</Card>

			<div className="flex gap-2">
				<Button type="button" variant={viewMode === 'all' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setViewMode('all')}>전체</Button>
				<Button type="button" variant={viewMode === 'year' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setViewMode('year')}>연도별</Button>
				<Button type="button" variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setViewMode('month')}>월별</Button>
			</div>

			{viewMode !== 'all' && (
				<Card>
					<CardContent className="flex flex-col gap-3 p-4 sm:p-4">
						<div className="flex items-center justify-between">
							<Button type="button" variant="ghost" size="icon" onClick={onPrevPeriod}>
								<ChevronLeft className="size-4" />
							</Button>
							<span className="text-base font-semibold">{periodLabel}</span>
							<Button type="button" variant="ghost" size="icon" onClick={onNextPeriod}>
								<ChevronRight className="size-4" />
							</Button>
						</div>
						<div className="flex justify-center gap-4 text-sm">
							<span className="text-primary">입금 {toWon(periodIncome)}원</span>
							<span className="text-destructive">출금 {toWon(periodExpense)}원</span>
						</div>
					</CardContent>
				</Card>
			)}

			{viewMode === 'month' && (
				<>
					<div className="overflow-hidden rounded-xl bg-card p-2 shadow-sm sm:p-4">
						<FullCalendar
							ref={calendarRef}
							plugins={[dayGridPlugin, interactionPlugin]}
							initialView={'dayGridMonth'}
							initialDate={periodDate.format('YYYY-MM-DD')}
							headerToolbar={false}
							locale={koLocale}
							height="auto"
							dayMaxEvents={0}
							displayEventTime={false}
							dayCellContent={(arg) => arg.date.getDate()}
							dayCellClassNames={(arg) => {
								// 일정 캘린더와 달리 여기는 기본이 "아무 날짜도 선택 안 함"이라,
								// 오늘 날짜를 실제로 선택했을 때도 표시가 나야 한다 - 그래서 오늘도 예외 없이 채운다.
								const dateStr = dayjs(arg.date).format('YYYY-MM-DD');
								return dateStr === selectedDate ? ['is-selected'] : [];
							}}
							moreLinkContent={(arg) => `+${arg.num}`}
							moreLinkClick={(arg) => {
								setSelectedDate(dayjs(arg.date).format('YYYY-MM-DD'));
								return 'none';
							}}
							dateClick={onCalendarDateClick}
							events={calendarEvents}
						/>
					</div>
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<CalendarClock className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-semibold">{selectedDateLabel} 내역</h2>
						</div>
						{selectedDate && (
							<Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
								전체 보기
							</Button>
						)}
					</div>
				</>
			)}

			<div className="flex items-center justify-between">
				<Button type="button" variant={isSelectMode ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={toggleSelectMode}>
					<CheckSquare className="size-4" /> {isSelectMode ? '선택 취소' : '선택해서 카테고리 설정'}
				</Button>
				{isSelectMode && <span className="text-sm text-muted-foreground">{selectedIds.size}건 선택됨</span>}
			</div>

			{isSelectMode && (
				<Card>
					<CardContent className="flex flex-col gap-2 p-3 sm:p-3">
						<Label className="text-xs text-muted-foreground">추가할 카테고리 (여러 개 선택 가능)</Label>
						{reports.length > 0 && (
							<Card>
								<CardContent className="max-h-40 divide-y overflow-y-auto p-0 sm:p-0">
									{reports.map((r) => (
										<label key={r.id} className="flex cursor-pointer items-center gap-2 p-2.5 text-sm">
											<Checkbox checked={bulkReportIds.has(r.id)} onCheckedChange={() => toggleBulkReport(r.id)} />
											{r.title}
										</label>
									))}
								</CardContent>
							</Card>
						)}
						<div className="flex gap-2">
							<Input value={bulkNewReportTitle} placeholder="새 카테고리 이름" onChange={(e) => setBulkNewReportTitle(e.target.value)} />
							<Button type="button" variant="outline" onClick={onAddNewReportToBulk}>추가</Button>
						</div>
						<Button
							type="button"
							className="gap-1.5"
							disabled={selectedIds.size === 0 || bulkApplying}
							onClick={onApplyBulkCategory}
						>
							{bulkApplying ? '적용 중...' : `선택한 ${selectedIds.size}건에 적용`}
						</Button>
					</CardContent>
				</Card>
			)}

			<div className="flex items-center gap-2">
				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="카테고리 선택" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value={ALL_CATEGORY_FILTER}>전체 카테고리</SelectItem>
							<SelectItem value={NO_CATEGORY_FILTER}>카테고리 없음</SelectItem>
							{reports.map((r) => (
								<SelectItem value={String(r.id)} key={r.id}>{r.title}</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="shrink-0 gap-1.5"
					onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
				>
					<ArrowUpDown className="size-4" /> {sortOrder === 'desc' ? '최신순' : '오래된순'}
				</Button>
			</div>

			{visibleLedger.length === 0 ? (
				<Card>
					<CardContent className="flex items-center justify-center p-8 sm:p-8 text-sm text-muted-foreground">
						{categoryFilter !== ALL_CATEGORY_FILTER
							? '이 카테고리에 해당하는 내역이 없습니다.'
							: viewMode === 'all' ? '등록된 내역이 없습니다.' : viewMode === 'month' ? `${selectedDateLabel} 내역이 없습니다.` : `${periodLabel} 내역이 없습니다.`}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="divide-y p-0 sm:p-0">
						{visibleLedger.map(renderLedgerRow)}
					</CardContent>
				</Card>
			)}

			<div className="flex gap-2">
				<Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={onAdd}>
					<Plus className="size-4" /> 내역 추가
				</Button>
				<Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={() => setBulkOpen(true)}>
					<ClipboardPaste className="size-4" /> 엑셀 붙여넣기
				</Button>
				<Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={onExportCsv}>
					<Download className="size-4" /> 엑셀로 보기
				</Button>
			</div>

			<Dialog open={isBulkOpen} onOpenChange={setBulkOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>엑셀에서 붙여넣기</DialogTitle>
						<DialogDescription>
							날짜 / 목적 / 입금 / 출금 / 금리 / 이자 / 빌린일수 / 비고 순서의 표를 그대로 복사해서 붙여넣어주세요.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						className="h-[300px] font-mono text-xs"
						value={bulkText}
						placeholder="엑셀에서 표를 선택해 복사(Ctrl+C)한 다음 여기에 붙여넣으세요(Ctrl+V)"
						onChange={(e) => setBulkText(e.target.value)}
					/>
					<p className="text-sm text-muted-foreground">{bulkEntries.length}건 인식됨</p>
					<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full" disabled={bulkSubmitting || bulkEntries.length === 0} onClick={onBulkImport}>
							{bulkSubmitting ? '등록 중...' : `${bulkEntries.length}건 등록`}
						</Button>
						<Button type="button" variant="secondary" className="w-full" onClick={() => setBulkOpen(false)}>닫기</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isAddAccountOpen} onOpenChange={setAddAccountOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>통장 추가</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-1.5">
						<Label>통장 이름</Label>
						<Input value={newAccountName} placeholder="예: 법인 통장" onChange={(e) => setNewAccountName(e.target.value)} autoFocus />
					</div>
					<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full" onClick={onAddAccount}>저장</Button>
						<Button type="button" variant="secondary" className="w-full" onClick={() => setAddAccountOpen(false)}>취소</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isOpen} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{form.id ? '내역 수정' : '내역 추가'}</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label>날짜</Label>
							<Input type="date" value={form.date} onChange={setField('date')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>목적</Label>
							<Input value={form.purpose} placeholder="목적" onChange={setField('purpose')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>카테고리 (요약표) · 여러 개 선택 가능</Label>
							{reports.length === 0 ? (
								<p className="rounded-md border p-3 text-center text-xs text-muted-foreground">아직 만들어진 카테고리가 없어요.</p>
							) : (
								<Card>
									<CardContent className="max-h-40 divide-y overflow-y-auto p-0 sm:p-0">
										{reports.map((r) => (
											<label key={r.id} className="flex cursor-pointer items-center gap-2 p-2.5 text-sm">
												<Checkbox checked={form.reportIds.includes(r.id)} onCheckedChange={() => toggleFormReport(r.id)} />
												{r.title}
											</label>
										))}
									</CardContent>
								</Card>
							)}
							<div className="flex gap-2">
								<Input value={newReportTitle} placeholder="새 카테고리 이름" onChange={(e) => setNewReportTitle(e.target.value)} />
								<Button type="button" variant="outline" onClick={onAddNewReportToForm}>추가</Button>
							</div>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>통장</Label>
							<Select
								value={isNewAccount ? NEW_ACCOUNT_VALUE : (form.bankAccountId ? String(form.bankAccountId) : NO_ACCOUNT_VALUE)}
								onValueChange={onAccountSelect}
							>
								<SelectTrigger>
									<SelectValue placeholder="통장 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value={NO_ACCOUNT_VALUE}>통장 없음</SelectItem>
										{accounts.map((a) => (
											<SelectItem value={String(a.id)} key={a.id}>{a.name}</SelectItem>
										))}
										<SelectItem value={NEW_ACCOUNT_VALUE}>+ 새 통장 추가</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							{isNewAccount && (
								<Input value={newAccountTitle} placeholder="새 통장 이름" onChange={(e) => setNewAccountTitle(e.target.value)} autoFocus />
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>입금</Label>
							<Input type="number" value={form.income} placeholder="입금" onChange={setField('income')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>출금</Label>
							<Input type="number" value={form.expense} placeholder="출금" onChange={setField('expense')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>금리(%)</Label>
							<Input type="number" value={form.interestRate} placeholder="예: 5.421" onChange={setField('interestRate')} />
						</div>
						<label className="flex items-center gap-2 rounded-md border p-3 text-sm">
							<Checkbox
								checked={form.interestAuto}
								onCheckedChange={(checked) => setForm((p) => ({ ...p, interestAuto: checked === true }))}
							/>
							<span>
								이자 매일 자동 계산
								<span className="block text-xs text-muted-foreground">
									켜두면 빌린일수·이자를 직접 못 넣고, 요약표에서도 매일 오늘 날짜 기준으로 다시 계산돼요.
									(이미 지급 끝난 이자는 꺼두고 값을 직접 넣어 고정하세요)
								</span>
							</span>
						</label>
						<div className="flex flex-col gap-1.5">
							<Label>빌린일수</Label>
							<Input
								type="number"
								value={form.borrowedDays}
								placeholder={form.interestAuto ? '오늘 - 날짜로 자동 계산' : '빌린일수'}
								disabled={form.interestAuto}
								onChange={setField('borrowedDays')}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>이자</Label>
							<Input
								type="number"
								value={form.interestAmount}
								placeholder={form.interestAuto ? '금리·빌린일수로 자동 계산' : '이자'}
								disabled={form.interestAuto}
								onChange={setField('interestAmount')}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>비고</Label>
							<Textarea value={form.notes} placeholder="비고" onChange={setField('notes')} />
						</div>
					</div>
					<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full" onClick={onSave}>저장</Button>
						{form.id && (
							<Button type="button" variant="destructive" className="w-full" onClick={onDelete}>삭제</Button>
						)}
						<Button type="button" variant="secondary" className="w-full" onClick={onClose}>닫기</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
