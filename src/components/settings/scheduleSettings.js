'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';

import { regScheduleTemplate, delScheduleTemplate } from '@/utils/core';
import { useScheduleTemplatesQuery, useBldInfoQuery } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectGroup, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const initialForm = {
	id: null,
	bldId: '',
	description: '',
	notes: '',
	dayOfMonth: '',
	active: true,
	skipHoliday: false,
};

export default function ScheduleSettings() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: templates = [] } = useScheduleTemplatesQuery();
	const { data: bldInfo } = useBldInfoQuery();
	const bldList = bldInfo?.Buildings ?? [];
	const [isOpen, setOpen] = useState(false);
	const [form, setForm] = useState(initialForm);

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['scheduleTemplates'] });
	}, [queryClient]);

	const onAdd = useCallback(() => {
		setForm(initialForm);
		setOpen(true);
	}, []);

	const onEditRow = useCallback((row) => {
		setForm({
			id: row.id,
			bldId: row.bldId ? String(row.bldId) : '',
			description: row.description || '',
			notes: row.notes || '',
			dayOfMonth: row.dayOfMonth ?? '',
			active: row.active ?? true,
			skipHoliday: row.skipHoliday ?? false,
		});
		setOpen(true);
	}, []);

	const onSave = useCallback(async () => {
		if (!form.dayOfMonth) {
			toast.warning('매월 며칠인지 입력해주세요.');
			return;
		}
		const res = await regScheduleTemplate({
			id: form.id,
			bldId: form.bldId || null,
			description: form.description,
			notes: form.notes,
			dayOfMonth: form.dayOfMonth,
			active: form.active,
			skipHoliday: form.skipHoliday,
		});

		if (!res) {
			toast.error('저장에 실패했습니다.');
			return;
		}

		toast.success(form.id ? '반복 일정이 수정되었습니다.' : '반복 일정이 등록되었습니다.');
		setOpen(false);
		invalidate();
	}, [form, invalidate]);

	const onDelete = useCallback(async () => {
		const res = await delScheduleTemplate(form.id);
		if (!res) {
			toast.error('삭제에 실패했습니다.');
			return;
		}
		toast.success('반복 일정이 삭제되었습니다.');
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
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">일정관리</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">반복 일정</CardTitle>
					<CardDescription>매월 정해진 날짜에 자동으로 일정이 등록돼요. (매일 새벽에 그날 해당하면 생성됩니다)</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{templates.length === 0 ? (
						<p className="py-4 text-center text-sm text-muted-foreground">등록된 반복 일정이 없어요.</p>
					) : (
						templates.map((row) => (
							<div
								key={row.id}
								className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3"
								onClick={() => onEditRow(row)}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
										<Repeat className="size-4" />
									</div>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">{row.description || '(내용 없음)'}</p>
										<p className="truncate text-xs text-muted-foreground">
											매월 {row.dayOfMonth}일{row.skipHoliday ? ' (휴무일이면 다음 평일)' : ''}{bldName(row.bldId) ? ` · ${bldName(row.bldId)}` : ''}{!row.active ? ' · 꺼짐' : ''}
										</p>
									</div>
								</div>
							</div>
						))
					)}
					<Button type="button" variant="outline" className="mt-2 gap-1.5" onClick={onAdd}>
						<Plus className="size-4" /> 반복 일정 추가
					</Button>
				</CardContent>
			</Card>

			<Dialog open={isOpen} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{form.id ? '반복 일정 수정' : '반복 일정 추가'}</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label>건물 (선택)</Label>
							<Select value={form.bldId || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, bldId: v === 'none' ? '' : v }))}>
								<SelectTrigger>
									<SelectValue placeholder="건물 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
									<SelectItem value="none">미지정</SelectItem>
									{bldList.map((b) => (
										<SelectItem value={String(b.id)} key={b.id}>{b.address}</SelectItem>
									))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>내용</Label>
							<Input value={form.description} placeholder="예: 세무사 기장비용" onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>매월 며칠</Label>
							<Input type="number" min="1" max="31" value={form.dayOfMonth} placeholder="예: 10" onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: e.target.value }))} />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label>비고</Label>
							<Textarea value={form.notes} placeholder="비고" onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
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
