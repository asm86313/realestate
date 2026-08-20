'use client'; // 클라이언트 컴포넌트로 선언

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileSearch, RotateCcw } from 'lucide-react';
import { dataBaseUrl, dataServicekey } from "@/utils/constants";
import PostcodeSearch from '@/components/postcode/postcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BldInfo({setSelectedInfo}) {

	const [address, setAddress] = useState(null);
	const [subCity, setSubCity] = useState(null);
	const [mainAddress, setMainAddress] = useState(null);
	const [subAddress, setSubAddress] = useState(null);
	const [sigunguCd, setSigunguCd] = useState(null);
	const [bjdongCd, setBjdongCd] = useState(null);
	const [bldInfos, setBldInfos] = useState([]);
    const [isSelected, setSelected] = useState(false);

	const getAddressCode = useCallback(() => {
		const url = `${dataBaseUrl}/1741000/StanReginCd/getStanReginCdList`; // URL
		const params = {
			serviceKey: dataServicekey,
			locatadd_nm: `${subCity}`,
			numOfRows: '10',
			pageNo: '1',
			type: 'json'
		};
		// Axios를 사용하여 GET 요청을 보냅니다.
		axios.get(url, { params }).then(response => {
			const row = response?.data?.StanReginCd?.[1]?.row?.[0];
			if (!row) {
				toast.warning('입력하신 주소로 지역코드를 찾지 못했습니다.');
				return;
			}
            setSigunguCd(`${row.sido_cd}${row.sgg_cd}`);
            setBjdongCd(`${row.umd_cd}${row.ri_cd}`);
        }).catch(error => {
            console.error('Error:', error);
			toast.error('지역코드 조회 중 오류가 발생했습니다.');
        });
	}, [subCity])

	const onLoadBldInfo = useCallback(() => {
		if (!subCity) {
			toast.warning('먼저 우편번호 찾기로 주소를 검색해주세요.');
			return;
		}
		setSigunguCd(null)
		setBjdongCd(null)
		setSelected(false);
		getAddressCode();
	},[subCity, getAddressCode])

	const getBldInfo = useCallback(() => {
		const url = `${dataBaseUrl}/1613000/BldRgstHubService/getBrTitleInfo`; // URL
		const params = {
			serviceKey: dataServicekey,
			sigunguCd: sigunguCd,
			bjdongCd: bjdongCd,
			platGbCd: '0',
			bun: mainAddress,
			ji: subAddress,
			startDate: '',
			endDate: '',
			numOfRows: '10',
			pageNo: '1',
			_type: 'json'
		};
		// Axios를 사용하여 GET 요청을 보냅니다.
		axios.get(url, { params }).then(res => {
			const items = res?.data?.response?.body?.items?.item;
			if (items) {
				setBldInfos(Array.isArray(items) ? items : [items]);
			} else {
				setBldInfos([]);
				toast.warning('해당 주소의 건축물대장 정보를 찾지 못했습니다.');
			}
            setSelectedInfo(null);
        }).catch(error => {
            console.error('Error:', error);
			toast.error('건축물대장 조회 중 오류가 발생했습니다.');
        });
	}, [sigunguCd, bjdongCd, mainAddress, subAddress, setSelectedInfo])

    const onSelectInfo = useCallback((info)=>{
		setSelected(true);
		setSelectedInfo(info);
		toast.success('선택한 건물 정보가 위 항목에 반영되었습니다.');
    }, [setSelectedInfo])

	const initBldInfo = useCallback(()=>{
		setBldInfos([]);
    }, [setBldInfos])

	useEffect(()=> {
		if(sigunguCd) {
			getBldInfo();
		}
	}, [sigunguCd, getBldInfo])

	useEffect(()=>{
		if(address) {
			const addressParts = address.split(" ");
			const addressParts1 = addressParts[addressParts.length-1].split("-");
			let addressName = '';
            addressParts.map((address, i) => {
                if (i !== 0 && i !== addressParts.length-1) {
                    addressName = addressName + ' ' + address;
                }
		    })
		    setSubCity(addressName);
		    setMainAddress(addressParts1[0].padStart(4, "0"));
		    if (addressParts1.length > 1) {
			    setSubAddress(addressParts1[1].padStart(4, "0"));
		    } else {
			    setSubAddress("0000");
		    }
	    }
	}, [address])

	return (
		<div className="flex flex-col gap-4">
			<PostcodeSearch setAddress={setAddress} />
			<div className="flex gap-2">
		    	<Button type="button" className="flex-1 gap-1.5 sm:flex-none" onClick={onLoadBldInfo}>
					<FileSearch className="size-4" /> 건축물대장불러오기
				</Button>
				<Button type="button" variant="outline" className="gap-1.5" onClick={initBldInfo}>
					<RotateCcw className="size-4" /> 초기화
				</Button>
			</div>
			{!isSelected && bldInfos.length > 0 && (
				<div className="flex flex-col gap-3">
					{bldInfos.map((b,i) => (
						<Card key={`bldInfo${i}`}>
							<CardContent className="flex flex-col gap-2 p-4 sm:p-4 text-sm">
								<p className="font-semibold">{`${b.bldNm}${b.dongNm}`.trim() || '건물명 없음'}</p>
								<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
									<span>주용도: {b.mainPurpsCdNm}</span>
									<span>층수: {b.ugrndFlrCnt}/{b.grndFlrCnt}</span>
									<span>면적: {b.totArea}</span>
									<span>승인일: {b.useAprDay}</span>
								</div>
								<Button type="button" size="sm" className="mt-1 self-end" onClick={() => onSelectInfo(b)}>선택</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
