"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { Building2, Loader2, Plus, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 10;

export default function TanstackTable({bldList, onClickList, onRegister}) {
	const [data, setData] = useState(bldList);
	const [searchQuery, setSearchQuery] = useState('');
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef(null);
	const columns = [
		{
			accessorKey: 'id',
			header: '순번',
			cell: (props) => <p>{props.row.index + 1}</p>,
		},
		{
			accessorKey: 'address',
			header: '주소',
			cell: (props) => <p>{props.getValue()}</p>,
		},
	];

	useEffect(()=> {
		setData(bldList)
	}, [bldList]);

	const normalizeString = useCallback((str) => {
		return (str || '')
			.normalize("NFC") // 문자열을 정규화 (한글 호환성 개선)
			.toLowerCase()     // 소문자 변환
			.replace(/\s+/g, ""); // 모든 공백 제거
		}, []);

	const filteredData = useMemo(() => {
		if (!searchQuery) return data ?? [];
		return (data ?? []).filter((item) =>
			normalizeString(item.bldName).includes(searchQuery.toLowerCase()) ||
			normalizeString(item.address).includes(searchQuery.toLowerCase()) ||
			normalizeString(item.mainPurps).includes(searchQuery.toLowerCase())
		);
		}, [searchQuery, data, normalizeString]);

	// 검색어/원본 데이터가 바뀌면 스크롤 페이징 위치를 처음으로 되돌린다.
	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
	}, [searchQuery, data]);

	const hasMore = visibleCount < filteredData.length;

	// 하단 sentinel이 화면에 걸리면 자동으로 다음 페이지만큼 더 보여준다.
	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || !hasMore) return;

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredData.length));
			}
		}, { rootMargin: '200px' });

		observer.observe(node);
		return () => observer.disconnect();
	}, [hasMore, filteredData.length]);

	const pagedData = useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount]);

	const table = useReactTable({
		data: pagedData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative w-full sm:max-w-xs">
					<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="주소, 건물명으로 검색"
						className="pl-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<Button type="button" onClick={onRegister} className="gap-1.5">
					<Plus className="size-4" /> 등록
				</Button>
			</div>

			{/* 데스크톱: 테이블 */}
			<div className="hidden overflow-hidden rounded-xl border md:block">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="hover:bg-transparent">
								{headerGroup.headers.map((header) => (
								<TableHead
									className="bg-muted/50 text-center font-semibold"
									key={header.id}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
									등록된 건물이 없습니다.
								</TableCell>
							</TableRow>
						)}
						{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id} className="cursor-pointer">
							{row.getVisibleCells().map((cell) => (
							<TableCell
								className="text-center"
								key={cell.id}
								onClick={() => onClickList(cell)}
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
							))}
						</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* 모바일: 카드 리스트 */}
			<div className="flex flex-col gap-3 md:hidden">
				{table.getRowModel().rows.length === 0 && (
					<Card>
						<CardContent className="flex items-center justify-center p-10 sm:p-10 text-sm text-muted-foreground">
							등록된 건물이 없습니다.
						</CardContent>
					</Card>
				)}
				{table.getRowModel().rows.map((row) => (
					<Card
						key={row.id}
						className="cursor-pointer transition-colors active:bg-accent"
						onClick={() => onClickList(row.getVisibleCells()[0])}
					>
						<CardContent className="flex items-center gap-3 p-4 sm:p-4">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<Building2 className="size-4" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs text-muted-foreground">#{row.index + 1}</p>
								<p className="truncate text-sm font-medium">{row.original.address}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* 자동 페이징 트리거: 스크롤로 이 지점에 닿으면 다음 목록을 이어서 불러온다 */}
			{hasMore && (
				<div ref={sentinelRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground">
					<Loader2 className="mr-2 size-4 animate-spin" /> 더 불러오는 중...
				</div>
			)}
		</div>
	);
};
