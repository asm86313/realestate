'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { regBldInfo, delBldInfo } from "@/utils/core";
import { useSelector } from 'react-redux';
import { buildingsState, contractsState } from "@/app/slices/storeSlice";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"



import Rentlist from '@/components/rentlist/rentlist';
import BldInfo from '@/components/bldinfo/bldinfo';
import css from "./write.module.css";

export default function Write() {
	const router = useRouter();
	const pathname = usePathname();
	const bldList = useSelector(buildingsState);
	const contractList = useSelector(contractsState);
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

	useEffect(() => {
		if(rentList) {
			toast.success('고객 정보가 수정되었습니다.');
		}
	},[rentList]);

	const onSave = useCallback(() => {
		if (isEditMode) {
			regBldInfo({ id, address, bldName, mainPurps, floor, platArea, totArea, useAprDay }, rentList)
			.then(() => {
				toast.warning('일정이 삭제되었습니다.');
			});
		} else {
			regBldInfo({ address, bldName, mainPurps, floor, platArea, totArea, useAprDay }, rentList
			).then(() => {
				toast.success('건물정보가 등록되었습니다.');
				router.push("/rsms");
			});
		}
	}, [rentList, isEditMode, address, bldName, mainPurps, platArea, totArea, useAprDay, router, floor, id]);

	const onCancel = useCallback(() => {
		router.push("/rsms");
	}, [router]);

	const onDelete = useCallback(() => {
		delBldInfo(id).then(() => {
			toast.success('건물정보가 삭제되었습니다.');
			router.push("/rsms");
		});
	}, [id, router]);

	return (
		<ScrollArea className="h-[85vh] w-[100%] rounded-md pb-5">
			<div className={css.cardContainer}>
				<div className={css.card}>

					<div className={css.row}>
						<label className={css.label}>주소</label>
						<input className={css.textInput} type="text" value={address} placeholder="주소" onChange={(e) => setAddress(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>건물명</label>
						<input className={css.textInput} type="text" value={bldName} placeholder="건물명" onChange={(e) => setBldName(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>주용도</label>
						<input className={css.textInput} type="text" value={mainPurps} placeholder="주용도" onChange={(e) => setMainPurps(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>{'층수(지하/지상)'}</label>
						<input className={css.textInput} type="text" value={floor} placeholder="층수(지하/지상)" onChange={(e) => setFloor(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>대지면적</label>
						<input className={css.textInput} type="text" value={platArea} placeholder="대지면적" onChange={(e) => setPlatArea(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>연면적</label>
						<input className={css.textInput} type="text" value={totArea} placeholder="연면적" onChange={(e) => setTotArea(e.target.value)}/>
					</div>
					<div className={css.row}>
						<label className={css.label}>승인일</label>
						<input className={css.textInput} type="text" value={useAprDay} placeholder="승인일" onChange={(e) => setUseAprDay(e.target.value)}/>
					</div>

				</div>
				<div className={css.card}>
					<BldInfo setSelectedInfo={setBldDefaultInfo}/>
				</div>
				<div className={css.card}>
					<Rentlist setRentList={setRentList} contractList={rentList}/>
				</div>
				<div className={css.addressForm}>
					<div className={css.row}>
						<Button onClick={onSave}>저장</Button>
						{id && <Button type="button" variant="destructive" onClick={onDelete}>삭제</Button>}
						<Button type="button" variant="secondary" onClick={onCancel}>뒤로</Button>
					</div>
				</div>
			</div>
		</ScrollArea>
	);
}