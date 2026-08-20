// 한국천문연구원 특일 정보(공공데이터포털) - 그 달의 공휴일 목록을 가져온다.
// 서버(크론)에서만 쓰인다.

export async function getHolidayDatesForMonth(year, month) {
	const baseUrl = process.env.NEXT_PUBLIC_DATA_BASE_URL;
	const serviceKey = process.env.NEXT_PUBLIC_DATA_SERVICE_KEY;

	if (!baseUrl || !serviceKey) return new Set();

	const url = `${baseUrl}/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`;
	const params = new URLSearchParams({
		serviceKey,
		solYear: String(year),
		solMonth: String(month).padStart(2, '0'),
		numOfRows: '30',
		pageNo: '1',
		_type: 'json',
	});

	try {
		const res = await fetch(`${url}?${params.toString()}`);
		const json = await res.json();
		const items = json?.response?.body?.items?.item;
		if (!items) return new Set();

		const list = Array.isArray(items) ? items : [items];
		const dates = list
			.filter((item) => item.isHoliday === 'Y')
			.map((item) => {
				const s = String(item.locdate); // YYYYMMDD
				return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
			});

		return new Set(dates);
	} catch (error) {
		console.error('공휴일 조회 실패:', error);
		return new Set();
	}
}
