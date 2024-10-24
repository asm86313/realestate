'use client'; // 클라이언트 컴포넌트로 선언

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import PostcodeSearch from '@/components/postcode/postcode';
import css from './bldinfo.module.css';
import { dataBaseUrl, dataServicekey } from "@/utils/constants";


export default function BldInfo({setSelectedInfo}) {

	const [address, setAddress] = useState('');
	const [subCity, setSubCity] = useState('');
	const [mainAddress, setMainAddress] = useState('');
	const [subAddress, setSubAddress] = useState('');
	const [sigunguCd, setSigunguCd] = useState('');
	const [bjdongCd, setBjdongCd] = useState('');
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
			console.log(response.data)
            setSigunguCd(`${response.data.StanReginCd[1].row[0].sido_cd}${response.data.StanReginCd[1].row[0].sgg_cd}`);
            setBjdongCd(`${response.data.StanReginCd[1].row[0].umd_cd}${response.data.StanReginCd[1].row[0].ri_cd}`);
        }).catch(error => {
            console.error('Error:', error);
        });
	}, [subCity])

	const onLoadBldInfo = useCallback(async () => {
		setSigunguCd('')
		setSelected(false);
		getAddressCode();
	},[])

	useEffect(()=> {
		if(sigunguCd) {
			getBldInfo();
		}
	}, [sigunguCd])

	const getBldInfo = useCallback(() => {
		const url = `${dataBaseUrl}/1613000/BldRgstService_v2/getBrTitleInfo`; // URL
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
			pageNo: '1'
		};
		// Axios를 사용하여 GET 요청을 보냅니다.
		axios.get(url, { params }).then(response => {
			console.log(response.data.response.body.items)
            if(response.data.response.body.items.item.length > 1) {
                setBldInfos(response.data.response.body.items.item);
            } else {
                setBldInfos([response.data.response.body.items.item]);
            }
            setSelectedInfo(null);
        }).catch(error => {
            console.error('Error:', error);
        });
	}, [sigunguCd, bjdongCd, mainAddress, subAddress])

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
			console.log("adressarwersdf",addressName)
		    setSubCity(addressName);
		    setMainAddress(addressParts1[0].padStart(4, "0"));
		    if (addressParts1.length > 1) {
			    setSubAddress(addressParts1[1].padStart(4, "0"));
		    } else {
			    setSubAddress("0000");
		    }
	    }
	}, [address])

    const onSelectInfo = useCallback((info)=>{
		setSelected(true);
		setSelectedInfo(info);
    })

	return (
		<div>
			<PostcodeSearch setAddress={setAddress} />
            <div className={css.addressForm}>
			    <button className={css.button} type='button' onClick={onLoadBldInfo}>건축물대장정보불러오기</button>
            </div>
			{!isSelected && bldInfos.map((b,i) => {
				return (
					<div className={css.addressForm} key={`bldInfo${i}`}>
                        <div className={css.row}>
                            <input className={css.textInput} type="text" value={`${b.bldNm}${b.dongNm}`} placeholder="건물명" readOnly />
                        </div>
                        <div className={css.row}>
                            <input className={css.textInput} type="text" value={b.mainPurpsCdNm} placeholder="주용도" readOnly />
                        </div>
                        <div className={css.row}>
                            <input className={css.textInput} type="text" value={`${b.ugrndFlrCnt}/${b.grndFlrCnt}`} placeholder="층수" readOnly />
                        </div>
                        <div className={css.row}>
                            <input className={css.textInput} type="text" value={b.totArea} placeholder="면적" readOnly />
                        </div>
                        <div className={css.row}>
                            <input className={css.textInput} type="text" value={b.useAprDay} placeholder="승인일" readOnly />
                        </div>
                        <button className={css.button} type='button' onClick={() => onSelectInfo(b)}>선택</button>
				    </div>
			    )})
			}
		</div>
	);
}