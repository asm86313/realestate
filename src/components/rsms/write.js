'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { regBldInfo, delBldInfo } from "@/utils/core";
import { useQueryClient } from '@tanstack/react-query';
import { useBldInfoQuery } from "@/hooks/queries";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

import Rentlist from '@/components/rentlist/rentlist';
import BldInfo from '@/components/bldinfo/bldinfo';

export default function Write() {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const { data } = useBldInfoQuery();
	const bldList = data?.Buildings ?? [];
	const contractList = data?.Contracts ?? [];
	const [bldDefaultInfo, setBldDefaultInfo] = useState(null);
	const [id, setId] = useState(null);
	const [address, setAddress] = useState('');
	const [bldName, setBldName] = useState('');
	const [mainPurps, setMainPurps] = useState('');
	const [floor, setFloor] = useState('');
	const [platArea, setPlatArea] = useState('');
	const [totArea, setTotArea] = useState('');
	const [useAprDay, setUseAprDay] = useState('');
	const [rentList, setRentList] = useState(null);
	const [isEditMode, setEditMode] = useState(false);

	useEffect(() => {
		let pathnameArray = pathname.split('/')
		if(pathnameArray.includes('edit')) {
			setEditMode(true);
			bldList.map(l => {
				if (l.id === Number(pathnameArray[pathnameArray.length - 1])) {
					setId(l.id)
					setAddress(l.address)
					setBldName(l.bldName)
					setMainPurps(l.mainPurps)
					setFloor(l.floor)
					setPlatArea(l.platArea)
					setTotArea(l.totArea)
					setUseAprDay(l.useAprDay)
				}
			})
		}
	}, [bldList, pathname]);

	useEffect(() => {
		let pathnameArray = pathname.split('/')
		if (pathnameArray.includes('edit')) {
			const _contractList = contractList.filter(l => l.bldId === Number(pathnameArray[pathnameArray.length - 1]))
			setRentList(_contractList)
		}
	}, [contractList, pathname]);

	useEffect(() => {
		if(bldDefaultInfo !== null) {
			setAddress(bldDefaultInfo.platPlc)
			setBldName(`${bldDefaultInfo.bldNm} ${bldDefaultInfo.dongNm}`)
			setMainPurps(bldDefaultInfo.mainPurpsCdNm)
			setFloor(`${bldDefaultInfo.ugrndFlrCnt}/${bldDefaultInfo.grndFlrCnt}`)
			setPlatArea(bldDefaultInfo.platArea)
			setTotArea(bldDefaultInfo.totArea)
			setUseAprDay(bldDefaultInfo.useAprDay)
		}
	},[bldDefaultInfo]);

	const onSave = useCallback(() => {
		if (isEditMode) {
			regBldInfo({ id, address, bldName, mainPurps, floor, platArea, totArea, useAprDay }, rentList)
			.then(() => {
				toast.warning('일정이 삭제되었습니다.');
				queryClient.invalidateQueries({ queryKey: ['bldInfo'] });
			});
		} else {
			regBldInfo({ address, bldName, mainPurps, floor, platArea, totArea, useAprDay }, rentList
			).then(() => {
				toast.success('건물정보가 등록되었습니다.');
				queryClient.invalidateQueries({ queryKey: ['bldInfo'] });
				router.push("/rsms");
			});
		}
	}, [rentList, isEditMode, address, bldName, mainPurps, platArea, totArea, useAprDay, router, floor, id, queryClient]);

	const onCancel = useCallback(() => {
		router.push("/rsms");
	}, [router]);

	const onDelete = useCallback(() => {
		delBldInfo(id).then(() => {
			toast.success('건물정보가 삭제되었습니다.');
			queryClient.invalidateQueries({ queryKey: ['bldInfo'] });
			router.push("/rsms");
		});
	}, [id, router, queryClient]);

	const fields = [
		{ label: '주소', value: address, set: setAddress, placeholder: '주소' },
		{ label: '건물명', value: bldName, set: setBldName, placeholder: '건물명' },
		{ label: '주용도', value: mainPurps, set: setMainPurps, placeholder: '주용도' },
		{ label: '층수(지하/지상)', value: floor, set: setFloor, placeholder: '층수(지하/지상)' },
		{ label: '대지면적', value: platArea, set: setPlatArea, placeholder: '대지면적' },
		{ label: '연면적', value: totArea, set: setTotArea, placeholder: '연면적' },
		{ label: '승인일', value: useAprDay, set: setUseAprDay, placeholder: '승인일' },
	];

	return (
		<div className="w-full">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-2 pb-24 sm:px-4">
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="icon" onClick={onCancel}>
						<ArrowLeft className="size-4" />
					</Button>
					<h1 className="text-xl font-bold tracking-tight sm:text-2xl">
						{isEditMode ? '건물 정보 수정' : '건물 등록'}
					</h1>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">기본 정보</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-1 gap-4">
						{fields.map((f) => (
							<div className="flex flex-col gap-1.5" key={f.label}>
								<Label>{f.label}</Label>
								<Input value={f.value} placeholder={f.placeholder} onChange={(e) => f.set(e.target.value)} />
							</div>
						))}
					</CardContent>
				</Card>

				{!isEditMode && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">건축물대장 조회</CardTitle>
						</CardHeader>
						<CardContent>
							<BldInfo setSelectedInfo={setBldDefaultInfo}/>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="text-base">임차인 목록</CardTitle>
					</CardHeader>
					<CardContent>
						<Rentlist setRentList={setRentList} contractList={rentList}/>
					</CardContent>
				</Card>
			</div>

			{/* 하단 고정 액션바 */}
			<div className="fixed inset-x-0 bottom-[60px] z-30 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<div className="mx-auto flex w-full max-w-3xl gap-2 px-2 sm:px-4">
					<Button className="flex-1 gap-1.5" onClick={onSave}>
						<Save className="size-4" /> 저장
					</Button>
					{id && (
						<Button type="button" variant="destructive" className="flex-1 gap-1.5" onClick={onDelete}>
							<Trash2 className="size-4" /> 삭제
						</Button>
					)}
					<Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
						뒤로
					</Button>
				</div>
			</div>
		</div>
	);
}
