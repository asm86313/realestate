'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';

import { regLedgerTemplate, delLedgerTemplate, saveLedgerReport, saveBankAccount } from '@/utils/core';
import { useLedgerTemplatesQuery, useBldInfoQuery, useLedgerReportsQuery, useBankAccountsQuery } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const NEW_REPORT_VALUE = '__new__';
const NO_REPORT_VALUE = '__none__';
const NEW_ACCOUNT_VALUE = '__new__';
const NO_ACCOUNT_VALUE = '__none__';

const numberFmt = new Intl.NumberFormat('ko-KR');
const toWon = (n) => (n === null || n === undefined || n === '' ? null : numberFmt.format(Number(n)));

const initialForm = {
	id: null,
	bldId: '',
	purpose: '',
	income: '',
	expense: '',
	interestRate: '',
	interestAmount: '',
	borrowedDays: '',
	notes: '',
	reportId: null,
	bankAccountId: null,
	dayOfMonth: '',
	active: true,
	skipHoliday: false,
};

export default function LedgerTemplateSettings() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: templates = [] } = useLedgerTemplatesQuery();
	const { data: bldInfo } = useBldInfoQuery();
	const bldList = bldInfo?.Buildings ?? [];
	const [isOpen, setOpen] = useState(false);
	const [form, setForm] = useState(initialForm);
	// 카테고리 = 요약표라, 지금 고른 건물(form.bldId)의 요약표 목록을 선택지로 쓴다.
	const { data: reports = [] } = useLedgerReportsQuery(form.bldId);
	const [isNewReport, setNewReport] = useState(false);
	const [newReportTitle, setNewReportTitle] = useState('');
	// 통장도 요약표처럼 지금 고른 건물(form.bldId) 단위로 관리된다.
	const { data: accounts = [] } = useBankAccountsQuery(form.bldId);
	const [isNewAccount, setNewAccount] = useState(false);
	const [newAccountTitle, setNewAccountTitle] = useState('');

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['ledgerTemplates'] });
	}, [queryClient]);

	const setField = useCallback((key) => (e) => {
		setForm((prev) => ({ ...prev, [key]: e.target.value }));
	}, []);

	const onAdd = useCallback(() => {
		setForm(initialForm);
		setNewReport(false);
		setNewReportTitle('');
		setNewAccount(false);
		setNewAccountTitle('');
		setOpen(true);
	}, []);

	const onEditRow = useCallback((row) => {
		setForm({
			id: row.id,
			bldId: row.bldId ? String(row.bldId) : '',
			purpose: row.purpose || '',
			income: row.income ?? '',
			expense: row.expense ?? '',
			interestRate: row.interestRate ?? '',
			interestAmount: row.interestAmount ?? '',
			borrowedDays: row.borrowedDays ?? '',
			notes: row.notes || '',
			reportId: row.reportId ?? null,
			bankAccountId: row.bankAccountId ?? null,
			dayOfMonth: row.dayOfMonth ?? '',
			active: row.active ?? true,
			skipHoliday: row.skipHoliday ?? false,
		});
		setNewReport(false);
		setNewReportTitle('');
		setNewAccount(false);
		setNewAccountTitle('');
		setOpen(true);
	}, []);

	// 건물을 바꾸면 요약표/통장 목록 자체가 달라지니, 고르고 있던 값은 초기화한다.
	const onBldSelect = useCallback((v) => {
		setForm((p) => ({ ...p, bldId: v, reportId: null, bankAccountId: null }));
		setNewReport(false);
		setNewReportTitle('');
		setNewAccount(false);
		setNewAccountTitle('');
	}, []);

	const onReportSelect = useCallback((v) => {
		if (v === NEW_REPORT_VALUE) {
			setNewReport(true);
			setForm((prev) => ({ ...prev, reportId: null }));
			return;
		}
		setNewReport(false);
		setForm((prev) => ({ ...prev, reportId: v === NO_REPORT_VALUE ? null : Number(v) }));
	}, []);

	const onAccountSelect = useCallback((v) => {
		if (v === NEW_ACCOUNT_VALUE) {
			setNewAccount(true);
			setForm((prev) => ({ ...prev, bankAccountId: null }));
			return;
		}
		setNewAccount(false);
		setForm((prev) => ({ ...prev, bankAccountId: v === NO_ACCOUNT_VALUE ? null : Number(v) }));
	}, []);

	const onSave = useCallback(async () => {
		if (!form.bldId) {
			toast.warning('건물을 선택해주세요.');
			return;
		}
		if (!form.dayOfMonth) {
			toast.warning('매월 며칠인지 입력해주세요.');
			return;
		}

		let reportId = form.reportId;
		if (isNewReport) {
			if (!newReportTitle.trim()) {
				toast.warning('새 카테고리 이름을 입력해주세요.');
				return;
			}
			const reportRes = await saveLedgerReport({ bldId: form.bldId, title: newReportTitle.trim(), items: [] });
			if (!reportRes) {
				toast.error('카테고리 생성에 실패했습니다.');
				return;
			}
			reportId = reportRes.data?.id ?? null;
			queryClient.invalidateQueries({ queryKey: ['ledgerReports', form.bldId] });
		}

		let bankAccountId = form.bankAccountId;
		if (isNewAccount) {
			if (!newAccountTitle.trim()) {
				toast.warning('새 통장 이름을 입력해주세요.');
				return;
			}
			const accountRes = await saveBankAccount({ bldId: form.bldId, name: newAccountTitle.trim() });
			if (!accountRes) {
				toast.error('통장 생성에 실패했습니다.');
				return;
			}
			bankAccountId = accountRes.data?.id ?? null;
			queryClient.invalidateQueries({ queryKey: ['bankAccounts', form.bldId] });
		}

		const res = await regLedgerTemplate({
			id: form.id,
			bldId: form.bldId,
			purpose: form.purpose,
			income: form.income,
			expense: form.expense,
			interestRate: form.interestRate,
			interestAmount: form.interestAmount,
			borrowedDays: form.borrowedDays,
			notes: form.notes,
			reportId,
			bankAccountId,
			dayOfMonth: form.dayOfMonth,
			active: form.active,
			skipHoliday: form.skipHoliday,
		});

		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}

		toast.success(form.id ? '반복 장부 항목이 수정되었습니다.' : '반복 장부 항목이 등록되었습니다.');
		setOpen(false);
		invalidate();
	}, [form, invalidate, isNewReport, newReportTitle, isNewAccount, newAccountTitle, queryClient]);

	const onDelete = useCallback(async () => {
		const res = await delLedgerTemplate(form.id);
		if (!res) {
			toast.error('삭제에 실패했습니다.');
			return;
		}
		toast.success('반복 장부 항목이 삭제되었습니다.');
		setOpen(false);
		invalidate();
	}, [form.id, invalidate]);

	const bldName = (bldId) => bldList.find((b) => b.id === bldId)?.address;

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div className="flex items-center gap-2">
				<Button type="button" variant="ghost" size="icon" onClick={() => router.push('/settings')}>
					<ArrowLeft className="size-4" />
				</Button>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">회계 관리</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">반복 장부 항목</CardTitle>
					<CardDescription>매월 정해진 날짜에 해당 건물 장부로 자동 등록돼요.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{templates.length === 0 ? (
						<p className="py-4 text-center text-sm text-muted-foreground">등록된 반복 장부 항목이 없어요.</p>
					) : (
						templates.map((row) => (
							<div
								key={row.id}
								className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3"
								onClick={() => onEditRow(row)}
							>
								<div className="flex min-w-0 items-center gap-3">
									<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
										<Repeat className="size-4" />
									</div>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{row.purpose || '(내용 없음)'}</p>
										<p className="truncate text-xs text-muted-foreground">
											매월 {row.dayOfMonth}일{row.skipHoliday ? ' (휴무일이면 다음 평일)' : ''} · {bldName(row.bldId) || '건물 미상'}{!row.active ? ' · 꺼짐' : ''}
										</p>
									</div>
								</div>
								<div className="shrink-0 text-right text-sm font-semibold">
									{row.income ? <p className="text-primary">+{toWon(row.income)}</p> : null}
									{row.expense ? <p className="text-destructive">-{toWon(row.expense)}</p> : null}
								</div>
							</div>
						))
					)}
					<Button type="button" variant="outline" className="mt-2 gap-1.5" onClick={onAdd}>
						<Plus className="size-4" /> 반복 장부 항목 추가
					</Button>
				</CardContent>
			</Card>

			<Dialog open={isOpen} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{form.id ? '반복 장부 항목 수정' : '반복 장부 항목 추가'}</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label>건물</Label>
							<Select value={form.bldId || undefined} onValueChange={onBldSelect}>
								<SelectTrigger>
									<SelectValue placeholder="건물 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
									{bldList.map((b) => (
										<SelectItem value={String(b.id)} key={b.id}>{b.address}</SelectItem>
									))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>목적</Label>
							<Input value={form.purpose} placeholder="예: 세무사 기장비용" onChange={setField('purpose')} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>매월 며칠</Label>
							<Input type="number" min="1" max="31" value={form.dayOfMonth} placeholder="예: 10" onChange={setField('dayOfMonth')} />
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
							<Input type="number" value={form.interestRate} placeholder="예: 5.5" onChange={setField('interestRate')} />
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
							<Label>카테고리 (요약표)</Label>
							<Select
								value={isNewReport ? NEW_REPORT_VALUE : (form.reportId ? String(form.reportId) : NO_REPORT_VALUE)}
								onValueChange={onReportSelect}
								disabled={!form.bldId}
							>
								<SelectTrigger>
									<SelectValue placeholder={form.bldId ? '카테고리 선택' : '건물을 먼저 선택하세요'} />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value={NO_REPORT_VALUE}>카테고리 없음</SelectItem>
										{reports.map((r) => (
											<SelectItem value={String(r.id)} key={r.id}>{r.title}</SelectItem>
										))}
										<SelectItem value={NEW_REPORT_VALUE}>+ 새 카테고리 추가</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
							{isNewReport && (
								<Input value={newReportTitle} placeholder="새 카테고리 이름" onChange={(e) => setNewReportTitle(e.target.value)} autoFocus />
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>통장</Label>
							<Select
								value={isNewAccount ? NEW_ACCOUNT_VALUE : (form.bankAccountId ? String(form.bankAccountId) : NO_ACCOUNT_VALUE)}
								onValueChange={onAccountSelect}
								disabled={!form.bldId}
							>
								<SelectTrigger>
									<SelectValue placeholder={form.bldId ? '통장 선택' : '건물을 먼저 선택하세요'} />
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
							<Label>비고</Label>
							<Textarea value={form.notes} placeholder="비고" onChange={setField('notes')} />
						</div>
						<label className="flex items-center gap-2 rounded-md border p-3 text-sm">
							<Checkbox
								checked={form.skipHoliday}
								onCheckedChange={(checked) => setForm((p) => ({ ...p, skipHoliday: checked === true }))}
							/>
							휴무일이면 다음 평일에 등록
						</label>
						<div className="flex items-center justify-between rounded-md border p-3">
							<Label>사용 중</Label>
							<Button
								type="button"
								variant={form.active ? 'default' : 'outline'}
								size="sm"
								onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
							>
								{form.active ? '켜짐' : '꺼짐'}
							</Button>
						</div>
					</div>
					<DialogFooter className="flex-col gap-2 space-x-0 sm:space-x-0">
						<Button type="button" className="w-full" onClick={onSave}>저장</Button>
						{form.id && (
							<Button type="button" variant="destructive" className="w-full" onClick={onDelete}>삭제</Button>
						)}
						<Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(false)}>닫기</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
