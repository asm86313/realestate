// 엑셀/스프레드시트에서 복사한 표(탭으로 구분, 셀 안에 줄바꿈이 있으면 "따옴표"로 감싸짐)를
// 회계 장부 항목 배열로 파싱한다.

// 탭 구분 텍스트를 행/열 2차원 배열로 분해한다 (CSV 스타일 따옴표 처리 포함).
function parseDelimitedText(text) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;
	let i = 0;

	while (i < text.length) {
		const char = text[i];

		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			field += char;
			i += 1;
			continue;
		}

		if (char === '"' && field === '') {
			inQuotes = true;
			i += 1;
			continue;
		}
		if (char === '\t') {
			row.push(field);
			field = '';
			i += 1;
			continue;
		}
		if (char === '\r') {
			i += 1;
			continue;
		}
		if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			i += 1;
			continue;
		}
		field += char;
		i += 1;
	}

	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// "₩ 1,234,000", "5.421%", "-", "" 등을 숫자로 정리한다. 값이 없으면 null.
function cleanNumber(value) {
	if (!value) return null;
	const trimmed = value.replace(/[₩,%\s]/g, '').trim();
	if (trimmed === '' || trimmed === '-') return null;
	const num = Number(trimmed);
	return Number.isNaN(num) ? null : num;
}

// "2024. 8. 26" / "2024.10.14" 등을 "2024-08-26" 형태로 정리한다.
function cleanDate(value) {
	if (!value) return null;
	const parts = value.split('.').map((p) => p.trim()).filter(Boolean);
	if (parts.length < 3) return null;
	const [y, m, d] = parts;
	return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// 열 순서: 날짜 / 목적 / 입금 / 출금 / 금리 / 이자 / 빌린일수 / 비고
export function parseBulkLedgerText(text) {
	const rows = parseDelimitedText(text.trim());

	return rows
		.filter((cols) => cols[0] && /\d/.test(cols[0])) // "날짜" 같은 헤더행은 걸러낸다
		.map((cols) => ({
			date: cleanDate(cols[0]),
			purpose: (cols[1] || '').trim(),
			income: cleanNumber(cols[2]),
			expense: cleanNumber(cols[3]),
			interestRate: cleanNumber(cols[4]),
			interestAmount: cleanNumber(cols[5]),
			borrowedDays: cleanNumber(cols[6]),
			notes: (cols[7] || '').trim(),
		}))
		.filter((entry) => entry.date); // 날짜 파싱이 안 되면 제외
}
