import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PostcodeSearch = ({setAddress}) => {
	const [postcode, setPostcode] = useState('');
	const [roadAddress, setRoadAddress] = useState('');
	const [jibunAddress, setJibunAddress] = useState('');
	const [extraAddress, setExtraAddress] = useState('');
	const [guideText, setGuideText] = useState('');

	useEffect(() => {
		// 스크립트를 동적으로 로드
		const script = document.createElement('script');
		script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
		script.async = true;
		document.body.appendChild(script);

		script.onload = () => {
			// 이제 window.daum.Postcode를 사용할 수 있습니다.
			window.daum.Postcode && (window.daum.Postcode.open = () => {
				new window.daum.Postcode({
					oncomplete: (data) => {
						let roadAddr = data.roadAddress; // 도로명 주소
						let extraRoadAddr = ''; // 참고 항목

						// 법정동명이 있을 경우 추가
						if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
							extraRoadAddr += data.bname;
						}

						// 건물명이 있고, 공동주택일 경우 추가
						if (data.buildingName !== '' && data.apartment === 'Y') {
							extraRoadAddr += (extraRoadAddr !== '' ? ', ' + data.buildingName : data.buildingName);
						}

						if (extraRoadAddr !== '') {
							extraRoadAddr = ' (' + extraRoadAddr + ')';
						}

						// 상태 업데이트
						setPostcode(data.zonecode);
						setRoadAddress(roadAddr);
						setJibunAddress(data.jibunAddress);
						setExtraAddress(roadAddr !== '' ? extraRoadAddr : '');
						setAddress(data.jibunAddress);
						// 가이드 텍스트 설정
						if (data.autoRoadAddress) {
							const expRoadAddr = data.autoRoadAddress + extraRoadAddr;
							setGuideText('(예상 도로명 주소 : ' + expRoadAddr + ')');
						} else if (data.autoJibunAddress) {
							const expJibunAddr = data.autoJibunAddress;
							setGuideText('(예상 지번 주소 : ' + expJibunAddr + ')');
						} else {
							setGuideText('');
						}
					}
				}).open();
			});
		};

		return () => {
			// 스크립트를 언로드하여 메모리 해제
			document.body.removeChild(script);
		};
	}, []);

	const sample4_execDaumPostcode = () => {
		new window.daum.Postcode({
			oncomplete: (data) => {
				let roadAddr = data.roadAddress; // 도로명 주소
				let extraRoadAddr = ''; // 참고 항목

				// 법정동명이 있을 경우 추가
				if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
					extraRoadAddr += data.bname;
				}

				// 건물명이 있고, 공동주택일 경우 추가
				if (data.buildingName !== '' && data.apartment === 'Y') {
					extraRoadAddr += (extraRoadAddr !== '' ? ', ' + data.buildingName : data.buildingName);
				}

				if (extraRoadAddr !== '') {
					extraRoadAddr = ' (' + extraRoadAddr + ')';
				}

				// 상태 업데이트
				setPostcode(data.zonecode);
				setRoadAddress(roadAddr);
				setJibunAddress(data.jibunAddress);
				setExtraAddress(roadAddr !== '' ? extraRoadAddr : '');
				setAddress(data.jibunAddress);
				// 가이드 텍스트 설정
				if (data.autoRoadAddress) {
					const expRoadAddr = data.autoRoadAddress + extraRoadAddr;
					setGuideText('(예상 도로명 주소 : ' + expRoadAddr + ')');
				} else if (data.autoJibunAddress) {
					const expJibunAddr = data.autoJibunAddress;
					setGuideText('(예상 지번 주소 : ' + expJibunAddr + ')');
				} else {
					setGuideText('');
				}
			}
		}).open();
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-2">
				<Input type="text" value={postcode} placeholder="우편번호" readOnly className="max-w-[8rem] bg-muted/40" />
				<Button type="button" variant="outline" className="shrink-0 gap-1.5" onClick={sample4_execDaumPostcode}>
					<Search className="size-4" /> 우편번호 찾기
				</Button>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input type="text" value={roadAddress} placeholder="도로명주소" readOnly className="bg-muted/40" />
				<Input type="text" value={jibunAddress} placeholder="지번주소" readOnly className="bg-muted/40" />
			</div>
			<Input type="text" value={extraAddress} placeholder="상세주소" readOnly className="bg-muted/40" />
			{guideText && <span className="text-xs text-muted-foreground">{guideText}</span>}
		</div>
	);
};

export default PostcodeSearch;
