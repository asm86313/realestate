"use client"

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCoreRowModel, useReactTable, flexRender, getPaginationRowModel } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import css from './tanstackTable.module.css';

export default function TanstackTable({bldList, onClickList}) {
	const tansTable = (bldList, onClickList) => {
		const [data, setData] = useState(bldList);
		const [searchQuery, setSearchQuery] = useState('');

		const columns = [
			{
				accessorKey: 'created_at',
				header: '순번',
				cell: (props) => <p>{props.row.index + 1}</p>,
				size: 80,
			},
			{
				accessorKey: 'bldName',
				header: '건물명',
				cell: (props) => <p>{props.getValue()}</p>,
				size: 150,
			},
			{
				accessorKey: 'address',
				header: '주소',
				cell: (props) => <p>{props.getValue()}</p>,
				size: 300,
			},
			{
				accessorKey: 'mainPurps',
				header: '용도',
				cell: (props) => <p>{props.getValue()}</p>,
				size: 200,
			},
			{
				accessorKey: 'platArea',
				header: '토지면적',
				cell: (props) => <p>{props.getValue()}</p>,
			},
			{
				accessorKey: 'totArea',
				header: '연면적',
				cell: (props) => <p>{props.getValue()}</p>,
			},
		];

		const PAGE_SIZE_OPTIONS = [
			{
			  value: 10,
			  label: '10개씩 보기',
			},
			{
			  value: 20,
			  label: '20개씩 보기',
			},
			{
			  value: 100,
			  label: '100개씩 보기',
			},
		];

		useEffect(()=> {
			setData(bldList)
		}, [bldList]);

		const onSearch = useCallback((e) =>{
			console.log(searchQuery, data)
		}, [searchQuery]);

		const normalizeString = useCallback((str) => {
			return str
			  .normalize("NFC") // 문자열을 정규화 (한글 호환성 개선)
			  .toLowerCase()     // 소문자 변환
			  .replace(/\s+/g, ""); // 모든 공백 제거
		  }, []);

		const filteredData = useMemo(() => {
			return data?.filter((item) =>
				normalizeString(item.bldName).includes(searchQuery.toLowerCase()) ||
				normalizeString(item.address).includes(searchQuery.toLowerCase()) ||
				normalizeString(item.mainPurps).includes(searchQuery.toLowerCase())
			);
		  }, [searchQuery, data]);

		const table = useReactTable({
			data : filteredData.length > 0 ? filteredData : data,
			columns,
			getCoreRowModel: getCoreRowModel(),
			initialState: {
				pagination: {
				  pageSize: 10, // 이렇게 추가해주면, 처음부터 20개씩 보여주지만, 컨트롤러에 의해 개수가 변경되지 않는다.
				},
			},
			getPaginationRowModel: getPaginationRowModel(),
		});

		const onChanged = useCallback((e) =>{
			table.setPageSize(e)
		}, [table]);

		return (
			<>
			<div className="flex justify-between">
				<div className="flex w-full max-w-sm items-center space-x-2 pl-6">
					<Input type="search" placeholder="검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
					<Button type="button" onClick={onSearch}>검색</Button>
				</div>
				<div className="text-right pr-6">
					<Select
							value={table.getState().pagination.pageSize}
							onValueChange={onChanged}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a fruit" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{PAGE_SIZE_OPTIONS.map(({ value, label }) => (
									<SelectItem value={value} key={value}>{label}</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				</div>
				<Table className={css.table} style={{ width: `${table.getTotalSize()}px` }}>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className={css.row}>
								{headerGroup.headers.map((header) => (
								<TableHead
									className={css.header}
									key={header.id}
									style={{ width: `${header.getSize()}px` }}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id} className={css.row}>
							{row.getVisibleCells().map((cell) => (
							<TableCell
								className={css.list}
								key={cell.id}
								style={{ width: `${cell.column.getSize()}px`, textAlign: 'center' }}
								onClick={() => onClickList(cell)}
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
							))}
						</TableRow>
						))}
					</TableBody>
				</Table>
				<div className="mt-[10px] flex items-center justify-center gap-2">
					<button
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						{'‹'}
					</button>
					<div className="text-base font-bold">
					{`${table.getState().pagination.pageIndex + 1} / ${table.getPageCount()}`}
					</div>
					<button
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						{'›'}
					</button>
				</div>
			</>
		);
	};

	return (
		<div>
			{tansTable(bldList, onClickList)}
		</div>
	)
}