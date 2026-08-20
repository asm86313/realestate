'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ClipboardPaste, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import { regLedger, delLedger } from '@/utils/core';
import { useLedgerQuery } from '@/hooks/queries';
import { parseBulkLedgerText } from '@/utils/ledgerImport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const numberFmt = new Intl.NumberFormat('ko-KR');

function toWon(n) {
	if (n === null || n === undefined || n === '') return null;
	return numberFmt.format(Number(n));
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
	notes: '',
};

export default function Ledger({ bldId }) {
	const queryClient = useQueryClient();
	const { data: ledger = [] } = useLedgerQuery(bldId);
	const [isOpen, setOpen] = useState(false);
	const [form, setForm] = useState(initialForm);
	const [isBulkOpen, setBulkOpen] = useState(false);
	const [bulkText, setBulkText] = useState('');
	const [bulkSubmitting, setBulkSubmitting] = useState(false);
	const [viewMode, setViewMode] = useState('month'); // 'all' | 'month' | 'year'
	const [periodDate, setPeriodDate] = useState(() => dayjs());

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['ledger', bldId] });
	}, [queryClient, bldId]);

	const setField = useCallback((key) => (e) => {
		setForm((prev) => ({ ...prev, [key]: e.target.value }));
	}, []);

	const onAdd = useCallback(() => {
		setForm(initialForm);
		setOpen(true);
	}, []);

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
			notes: row.notes || '',
		});
		setOpen(true);
	}, []);

	const onClose = useCallback(() => {
		setOpen(false);
	}, []);

	const onSave = useCallback(async () => {
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
			notes: form.notes,
		});

		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}

		toast.success(form.id ? '항목이 수정되었습니다.' : '항목이 등록되었습니다.');
		setOpen(false);
		invalidate();
	}, [form, bldId, invalidate]);

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
			const results = await Promise.all(
				bulkEntries.map((entry) => regLedger({ ...entry, bldId }))
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
	}, [bulkEntries, bldId, invalidate]);

	const totalIncome = ledger.reduce((sum, row) => sum + Number(row.income || 0), 0);
	const totalExpense = ledger.reduce((sum, row) => sum + Number(row.expense || 0), 0);
	const balance = totalIncome - totalExpense;

	const onPrevPeriod = useCallback(() => {
		setPeriodDate((d) => d.subtract(1, viewMode === 'year' ? 'year' : 'month'));
	}, [viewMode]);

	const onNextPeriod = useCallback(() => {
		setPeriodDate((d) => d.add(1, viewMode === 'year' ? 'year' : 'month'));
	}, [viewMode]);

	const filteredLedger = useMemo(() => {
		if (viewMode === 'all') return ledger;
		const unit = viewMode === 'year' ? 'year' : 'month';
		return ledger.filter((row) => row.date && dayjs(row.date).isSame(periodDate, unit));
	}, [ledger, viewMode, periodDate]);

	const periodLabel = viewMode === 'all'
		? '전체 내역'
		: viewMode === 'year'
			? periodDate.format('YYYY년')
			: periodDate.format('YYYY년 M월');

	const periodIncome = filteredLedger.reduce((sum, row) => sum + Number(row.income || 0), 0);
	const periodExpense = filteredLedger.reduce((sum, row) => sum + Number(row.expense || 0), 0);

	return (
		<div className="flex flex-col gap-3">
			<Card>
				<CardContent className="flex flex-col gap-3 p-4 sm:p-4">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Wallet className="size-4" /> 잔액
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

			{filteredLedger.length === 0 ? (
				<Card>
					<CardContent className="flex items-center justify-center p-8 sm:p-8 text-sm text-muted-foreground">
						{viewMode === 'all' ? '등록된 내역이 없습니다.' : `${periodLabel} 내역이 없습니다.`}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="divide-y p-0 sm:p-0">
						{filteredLedger.map((row) => (
							<div
								key={row.id}
								className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-accent active:bg-accent"
								onClick={() => onEditRow(row)}
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{row.purpose || '(내용 없음)'}</p>
									<p className="text-xs text-muted-foreground">{row.date}</p>
									{row.notes && <p className="truncate text-xs text-muted-foreground">{row.notes}</p>}
								</div>
								<div className="shrink-0 text-right text-sm font-semibold">
									{row.income ? <p className="text-primary">+{toWon(row.income)}</p> : null}
									{row.expense ? <p className="text-destructive">-{toWon(row.expense)}</p> : null}
								</div>
							</div>
						))}
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
						<div className="flex flex-col gap-1.5">
							<Label>이자</Label>
							<Input type="number" value={form.interestAmount} placeholder="이자" onChange={setField('interestAmount')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>빌린일수</Label>
							<Input type="number" value={form.borrowedDays} placeholder="빌린일수" onChange={setField('borrowedDays')} />
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
