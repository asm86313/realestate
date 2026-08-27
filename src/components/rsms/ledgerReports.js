'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, FileText, Folder, Landmark, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { saveLedgerReport, delLedgerReport } from '@/utils/core';
import { ledgerRowAmount, liveInterestAmount } from '@/utils/ledgerAmount';
import { useLedgerReportsQuery, useBankAccountsQuery } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const numberFmt = new Intl.NumberFormat('ko-KR');

function toWon(n) {
	if (n === null || n === undefined || n === '') return null;
	return numberFmt.format(Number(n));
}

const emptyDraft = { id: null, title: '', groupNames: [], items: [] };

// 전체 내역 중 원하는 것만 검색해서 고르거나, 직접 입력한 줄을 섞어서
// "총 비용"처럼 이름 붙은 요약표로 저장해두는 기능. 회계 > 전체 탭에서만 쓰인다.
export default function LedgerReports({ bldId, ledger }) {
	const queryClient = useQueryClient();
	const { data: reports = [] } = useLedgerReportsQuery(bldId);
	const { data: accounts = [] } = useBankAccountsQuery(bldId);
	const accountNameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

	const [isBuilderOpen, setBuilderOpen] = useState(false);
	const [draft, setDraft] = useState(emptyDraft);
	const [search, setSearch] = useState('');
	const [manualLabel, setManualLabel] = useState('');
	const [manualAmount, setManualAmount] = useState('');
	const [manualNotes, setManualNotes] = useState('');
	const [groupInput, setGroupInput] = useState('');
	const [detailReportId, setDetailReportId] = useState(null);
	// 상세보기 안 내역 정렬: 기본은 최신 날짜부터(내림차순). 날짜가 없는 줄(직접 입력)은 맨 뒤로 보낸다.
	const [itemSortOrder, setItemSortOrder] = useState('desc');

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['ledgerReports', bldId] });
	}, [queryClient, bldId]);

	// 요약표 = 카테고리라, 이 요약표를 고른 내역(reportIds)은 수동으로 안 골라도 자동으로 잡힌다.
	// 내역 하나가 요약표 여러 개에 동시에 속할 수 있어서, 각 요약표는 자기 id가 그 내역의
	// reportIds 배열에 들어있으면 잡아온다 (같은 내역이 여러 요약표에 동시에 집계될 수 있다).
	// (같은 내역을 검색으로 또 골라 넣었으면 중복 집계되지 않게 ledgerId로 걸러낸다.)
	const reportsWithLive = useMemo(() => {
		const ledgerById = new Map(ledger.map((row) => [row.id, row]));

		return reports.map((r) => {
			const pickedLedgerIds = new Set(r.items.filter((it) => it.ledgerId).map((it) => it.ledgerId));
			const liveItems = ledger
				.filter((row) => (row.reportIds || []).includes(r.id) && !pickedLedgerIds.has(row.id))
				.map((row) => {
					const interest = liveInterestAmount(row);
					const amount = ledgerRowAmount(row);
					return {
						id: `live-${row.id}`,
						label: row.purpose || '(내용 없음)',
						amount,
						principal: amount - interest,
						interest,
						notes: interest ? `${row.date} · 원금+이자 ${toWon(interest)}원 포함` : row.date,
						date: row.date || null,
						bankAccountId: row.bankAccountId ?? null,
						isLive: true,
					};
				});

			// 검색으로 골라 저장해둔 줄(ledgerId 있음)은 저장된 금액 대신 지금 장부 값으로
			// 다시 계산해서 보여준다 - 계산 방식이 바뀌거나(예전엔 출금을 마이너스로 저장)
			// 원본 내역이 그 사이 수정됐어도 항상 최신 금액을 보여주기 위함이다.
			// 통장/원금/이자도 원본 내역에서 가져온다 - 직접 입력한 줄(ledgerId 없음)은
			// 원금/이자를 나눌 근거가 없어서 전액을 원금으로 취급한다.
			const correctedItems = r.items.map((it) => {
				const src = it.ledgerId && ledgerById.get(it.ledgerId);
				if (!src) return { ...it, principal: it.amount, interest: 0, date: null };
				const interest = liveInterestAmount(src);
				const amount = ledgerRowAmount(src);
				return { ...it, amount, principal: amount - interest, interest, bankAccountId: src.bankAccountId ?? null, date: src.date || null };
			});

			const allItems = [...liveItems, ...correctedItems];
			const total = allItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);
			const totalPrincipal = allItems.reduce((sum, it) => sum + Number(it.principal || 0), 0);
			const totalInterest = allItems.reduce((sum, it) => sum + Number(it.interest || 0), 0);

			// 통장별 소계. 통장을 알 수 없는 줄(직접 입력)은 "미지정"으로 따로 묶는다.
			const byAccount = new Map();
			for (const it of allItems) {
				const key = it.bankAccountId ?? null;
				byAccount.set(key, (byAccount.get(key) || 0) + Number(it.amount || 0));
			}
			const accountBreakdown = Array.from(byAccount.entries()).map(([accountId, amount]) => ({
				accountId,
				name: accountId ? accountNameById.get(accountId) || '알 수 없는 통장' : '미지정',
				amount,
			}));

			return { ...r, correctedItems, allItems, total, accountBreakdown, totalPrincipal, totalInterest };
		});
	}, [reports, ledger, accountNameById]);

	const detailReport = reportsWithLive.find((r) => r.id === detailReportId) || null;

	// 통장별 카드 안에서 보여줄 내역 정렬. 날짜 없는 직접 입력 줄은 항상 맨 뒤에 둔다.
	const sortedDetailItems = useMemo(() => {
		if (!detailReport) return [];
		const dir = itemSortOrder === 'desc' ? -1 : 1;
		return detailReport.allItems.slice().sort((a, b) => {
			if (!a.date && !b.date) return 0;
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date.localeCompare(b.date) * dir;
		});
	}, [detailReport, itemSortOrder]);

	// 그룹도 이제 요약표 하나가 여러 개에 동시에 속할 수 있다. 자기가 속한 그룹마다 한 번씩
	// 그 그룹 카드에 나타난다(같은 요약표가 여러 그룹 합계에 동시에 들어갈 수 있다는 뜻).
	// 그룹이 하나도 없는 요약표는 예전처럼 개별로 보여준다.
	const { groupedList, standaloneList } = useMemo(() => {
		const groups = new Map();
		const standalone = [];
		for (const r of reportsWithLive) {
			const names = r.groupNames || [];
			if (names.length === 0) {
				standalone.push(r);
				continue;
			}
			for (const name of names) {
				const list = groups.get(name) || [];
				list.push(r);
				groups.set(name, list);
			}
		}
		const groupedList = Array.from(groups.entries()).map(([groupName, list]) => ({
			groupName,
			reports: list,
			total: list.reduce((sum, r) => sum + r.total, 0),
		}));
		return { groupedList, standaloneList: standalone };
	}, [reportsWithLive]);

	// 그룹 입력 자동완성용 목록.
	const groupOptions = useMemo(
		() => Array.from(new Set(reports.flatMap((r) => r.groupNames || []))).sort(),
		[reports]
	);

	const searchResults = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return [];
		const alreadyPickedIds = new Set(draft.items.filter((i) => i.ledgerId).map((i) => i.ledgerId));
		return ledger
			.filter((row) => !alreadyPickedIds.has(row.id))
			.filter((row) => `${row.purpose || ''} ${row.notes || ''}`.toLowerCase().includes(q))
			.slice(0, 20);
	}, [ledger, search, draft.items]);

	const resetBuilderInputs = useCallback(() => {
		setSearch('');
		setManualLabel('');
		setManualAmount('');
		setManualNotes('');
		setGroupInput('');
	}, []);

	// 그룹도 카테고리처럼 여러 개를 태그로 추가/제거한다.
	const addDraftGroup = useCallback(() => {
		const name = groupInput.trim();
		if (!name) return;
		setDraft((prev) => (prev.groupNames.includes(name) ? prev : { ...prev, groupNames: [...prev.groupNames, name] }));
		setGroupInput('');
	}, [groupInput]);

	const removeDraftGroup = useCallback((name) => {
		setDraft((prev) => ({ ...prev, groupNames: prev.groupNames.filter((g) => g !== name) }));
	}, []);

	const onOpenNewBuilder = useCallback(() => {
		setDraft(emptyDraft);
		resetBuilderInputs();
		setBuilderOpen(true);
	}, [resetBuilderInputs]);

	const onOpenEditBuilder = useCallback((report) => {
		setDraft({
			id: report.id,
			title: report.title,
			groupNames: report.groupNames || [],
			items: report.correctedItems.map((it) => ({
				label: it.label,
				amount: it.amount,
				notes: it.notes || '',
				ledgerId: it.ledgerId || null,
			})),
		});
		resetBuilderInputs();
		setDetailReportId(null);
		setBuilderOpen(true);
	}, [resetBuilderInputs]);

	const addItemFromLedger = useCallback((row) => {
		const amount = ledgerRowAmount(row);
		const interest = liveInterestAmount(row);
		const notes = interest ? `${row.date} · 원금+이자 ${toWon(interest)}원 포함` : row.date || '';
		setDraft((prev) => ({
			...prev,
			items: [...prev.items, { label: row.purpose || '(내용 없음)', amount, notes, ledgerId: row.id }],
		}));
	}, []);

	const addManualItem = useCallback(() => {
		if (!manualLabel.trim() || manualAmount === '') {
			toast.warning('항목명과 금액을 입력해주세요.');
			return;
		}
		setDraft((prev) => ({
			...prev,
			items: [...prev.items, { label: manualLabel.trim(), amount: Number(manualAmount), notes: manualNotes.trim() || '', ledgerId: null }],
		}));
		setManualLabel('');
		setManualAmount('');
		setManualNotes('');
	}, [manualLabel, manualAmount, manualNotes]);

	const removeItem = useCallback((index) => {
		setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
	}, []);

	const draftTotal = draft.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

	const onSaveDraft = useCallback(async () => {
		if (!draft.title.trim()) {
			toast.warning('제목을 입력해주세요.');
			return;
		}
		// 내역 없이 이름만 있는 껍데기로도 저장할 수 있다 - 나중에 열어서 채우면 된다.
		const res = await saveLedgerReport({ id: draft.id, bldId, title: draft.title, groupNames: draft.groupNames, items: draft.items });
		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}
		toast.success('요약표가 저장되었습니다.');
		setBuilderOpen(false);
		invalidate();
	}, [draft, bldId, invalidate]);

	const onDeleteReport = useCallback(async (id) => {
		const res = await delLedgerReport(id);
		if (!res) {
			toast.error('삭제에 실패했습니다.');
			return;
		}
		toast.success('요약표가 삭제되었습니다.');
		setDetailReportId(null);
		invalidate();
	}, [invalidate]);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h2 className="flex items-center gap-2 text-sm font-semibold">
					<FileText className="size-4 text-muted-foreground" /> 저장된 요약표
				</h2>
				<Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onOpenNewBuilder}>
					<Plus className="size-4" /> 새 요약표
				</Button>
			</div>

			{reportsWithLive.length === 0 ? (
				<Card>
					<CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
						저장된 요약표가 없습니다.
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-2">
					{groupedList.map((g) => (
						<Card key={g.groupName}>
							<CardContent className="flex items-center justify-between gap-3 border-b p-3 sm:p-3">
								<div className="flex items-center gap-1.5 text-sm font-semibold">
									<Folder className="size-4 text-muted-foreground" /> {g.groupName}
								</div>
								<p className="text-sm font-semibold">{toWon(g.total)}원</p>
							</CardContent>
							<CardContent className="divide-y p-0 sm:p-0">
								{g.reports.map((r) => (
									<div
										key={r.id}
										className="flex cursor-pointer items-center justify-between gap-3 py-3 pl-8 pr-4 transition-colors hover:bg-accent active:bg-accent"
										onClick={() => setDetailReportId(r.id)}
									>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{r.title}</p>
											<p className="text-xs text-muted-foreground">{dayjs(r.createdAt).format('YYYY.M.D')} · {r.allItems.length}건</p>
										</div>
										<p className="shrink-0 text-sm font-semibold">{toWon(r.total)}원</p>
									</div>
								))}
							</CardContent>
						</Card>
					))}

					{standaloneList.length > 0 && (
						<Card>
							<CardContent className="divide-y p-0 sm:p-0">
								{standaloneList.map((r) => (
									<div
										key={r.id}
										className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-accent active:bg-accent"
										onClick={() => setDetailReportId(r.id)}
									>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{r.title}</p>
											<p className="text-xs text-muted-foreground">{dayjs(r.createdAt).format('YYYY.M.D')} · {r.allItems.length}건</p>
										</div>
										<p className="shrink-0 text-sm font-semibold">{toWon(r.total)}원</p>
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* 상세보기 */}
			<Dialog open={!!detailReport} onOpenChange={(open) => !open && setDetailReportId(null)}>
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					{detailReport && (
						<>
							<DialogHeader>
								<DialogTitle>{detailReport.title}</DialogTitle>
								{detailReport.groupNames?.length > 0 && (
									<DialogDescription className="flex flex-wrap items-center gap-1">
										<Folder className="size-3.5" /> {detailReport.groupNames.join(', ')} 그룹
									</DialogDescription>
								)}
							</DialogHeader>
							{detailReport.totalInterest > 0 && (
								<Card>
									<CardContent className="divide-y p-0 sm:p-0">
										<div className="flex items-center justify-between gap-3 p-2.5 text-sm">
											<span className="text-muted-foreground">원금</span>
											<span className="font-medium">{toWon(detailReport.totalPrincipal)}원</span>
										</div>
										<div className="flex items-center justify-between gap-3 p-2.5 text-sm">
											<span className="text-muted-foreground">이자</span>
											<span className="font-medium">{toWon(detailReport.totalInterest)}원</span>
										</div>
									</CardContent>
								</Card>
							)}

							{detailReport.accountBreakdown.length > 1 && (
								<Card>
									<CardContent className="divide-y p-0 sm:p-0">
										{detailReport.accountBreakdown.map((b) => (
											<div key={b.accountId ?? 'none'} className="flex items-center justify-between gap-3 p-2.5 text-sm">
												<span className="flex items-center gap-1.5 text-muted-foreground">
													<Landmark className="size-3.5" /> {b.name}
												</span>
												<span className="font-medium">소계 {toWon(b.amount)}원</span>
											</div>
										))}
									</CardContent>
								</Card>
							)}

							<Card className="mt-1">
								<CardContent className="flex flex-col items-center justify-center gap-1.5 bg-muted/50 pt-4 text-center sm:pt-6">
									<span className="text-sm font-medium text-muted-foreground">합계</span>
									<span className="text-2xl font-bold tracking-tight">{toWon(detailReport.total)}원</span>
								</CardContent>
							</Card>

							{detailReport.allItems.length === 0 ? (
								<Card>
									<CardContent className="p-3 text-center text-sm text-muted-foreground">
										아직 내역이 없어요. 수정을 눌러 채워보거나, 내역에서 이 카테고리를 골라보세요.
									</CardContent>
								</Card>
							) : (
								<>
									<div className="flex justify-end">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="gap-1.5"
											onClick={() => setItemSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
										>
											<ArrowUpDown className="size-4" /> {itemSortOrder === 'desc' ? '최신순' : '오래된순'}
										</Button>
									</div>
									{detailReport.accountBreakdown.map((b) => (
										<Card key={b.accountId ?? 'none'}>
											<CardContent className="flex items-center justify-between gap-3 border-b p-3 sm:p-3">
												<span className="flex items-center gap-1.5 text-sm font-semibold">
													<Landmark className="size-3.5 text-muted-foreground" /> {b.name}
												</span>
												<span className="text-sm font-semibold">소계 {toWon(b.amount)}원</span>
											</CardContent>
											<CardContent className="divide-y p-0 sm:p-0">
												{sortedDetailItems
													.filter((it) => (it.bankAccountId ?? null) === b.accountId)
													.map((it) => (
														<div key={it.id} className="flex items-center justify-between gap-3 p-3">
															<div className="min-w-0 flex-1">
																<div className="flex items-center gap-1.5">
																	<p className="truncate text-sm">{it.label}</p>
																	{it.isLive && (
																		<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">자동</span>
																	)}
																</div>
																{it.notes && <p className="truncate text-xs text-muted-foreground">{it.notes}</p>}
															</div>
															<p className="shrink-0 text-sm font-medium">{toWon(it.amount)}원</p>
														</div>
													))}
											</CardContent>
										</Card>
									))}
								</>
							)}
							<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
								<Button type="button" className="w-full" onClick={() => onOpenEditBuilder(detailReport)}>수정</Button>
								<Button type="button" variant="destructive" className="w-full" onClick={() => onDeleteReport(detailReport.id)}>삭제</Button>
								<Button type="button" variant="secondary" className="w-full" onClick={() => setDetailReportId(null)}>닫기</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* 빌더 */}
			<Dialog open={isBuilderOpen} onOpenChange={setBuilderOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{draft.id ? '요약표 수정' : '새 요약표 만들기'}</DialogTitle>
						<DialogDescription>내역을 검색해서 추가하거나, 직접 입력해서 줄을 만들 수 있어요.</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1.5">
						<Label>제목</Label>
						<Input value={draft.title} placeholder="예: 은행이자" onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>그룹 (선택) · 여러 개 선택 가능</Label>
						{draft.groupNames.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{draft.groupNames.map((g) => (
									<span key={g} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
										{g}
										<button type="button" onClick={() => removeDraftGroup(g)}>
											<X className="size-3" />
										</button>
									</span>
								))}
							</div>
						)}
						<div className="flex gap-2">
							<Input
								value={groupInput}
								placeholder="예: 이자비용 (여러 요약표를 한 그룹으로 묶어서 보고 싶을 때)"
								list="ledger-report-group-list"
								onChange={(e) => setGroupInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addDraftGroup();
									}
								}}
							/>
							<Button type="button" variant="outline" onClick={addDraftGroup}>추가</Button>
						</div>
						<datalist id="ledger-report-group-list">
							{groupOptions.filter((g) => !draft.groupNames.includes(g)).map((g) => (
								<option value={g} key={g} />
							))}
						</datalist>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>내역 검색</Label>
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input className="pl-8" value={search} placeholder="목적/비고로 검색" onChange={(e) => setSearch(e.target.value)} />
						</div>
						{searchResults.length > 0 && (
							<Card>
								<CardContent className="max-h-40 divide-y overflow-y-auto p-0 sm:p-0">
									{searchResults.map((row) => (
										<button
											type="button"
											key={row.id}
											className="flex w-full items-center justify-between gap-2 p-2.5 text-left text-sm transition-colors hover:bg-accent"
											onClick={() => addItemFromLedger(row)}
										>
											<span className="min-w-0 flex-1 truncate">
												{row.purpose || '(내용 없음)'} <span className="text-xs text-muted-foreground">{row.date}</span>
											</span>
											<span className="shrink-0 font-medium">{toWon(ledgerRowAmount(row))}원</span>
										</button>
									))}
								</CardContent>
							</Card>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>직접 입력</Label>
						<div className="grid grid-cols-[1fr_1fr_auto] gap-2">
							<Input value={manualLabel} placeholder="항목명" onChange={(e) => setManualLabel(e.target.value)} />
							<Input type="number" value={manualAmount} placeholder="금액" onChange={(e) => setManualAmount(e.target.value)} />
							<Button type="button" size="icon" variant="outline" onClick={addManualItem}>
								<Plus className="size-4" />
							</Button>
						</div>
						<Input value={manualNotes} placeholder="비고 (선택)" onChange={(e) => setManualNotes(e.target.value)} />
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>추가된 내역 ({draft.items.length}건)</Label>
						{draft.items.length === 0 ? (
							<p className="p-3 text-center text-sm text-muted-foreground">아직 추가된 내역이 없어요.</p>
						) : (
							<Card>
								<CardContent className="divide-y p-0 sm:p-0">
									{draft.items.map((it, index) => (
										<div key={index} className="flex items-center justify-between gap-2 p-2.5">
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm">{it.label}</p>
												{it.notes && <p className="truncate text-xs text-muted-foreground">{it.notes}</p>}
											</div>
											<span className="shrink-0 text-sm font-medium">{toWon(it.amount)}원</span>
											<Button type="button" size="icon" variant="ghost" onClick={() => removeItem(index)}>
												<X className="size-4" />
											</Button>
										</div>
									))}
									<div className="flex items-center justify-between p-2.5 font-semibold">
										<span>합계</span>
										<span>{toWon(draftTotal)}원</span>
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full" onClick={onSaveDraft}>저장</Button>
						<Button type="button" variant="secondary" className="w-full" onClick={() => setBuilderOpen(false)}>취소</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
