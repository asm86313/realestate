// 은행/신협 등에서 "엑셀로 받기"로 내려받은 거래내역조회 파일(.xlsx)을 그대로 업로드해서
// 회계 장부 항목으로 바로 저장하는 기능. utils/ledgerImport.js(붙여넣기 파싱)와는 별개로,
// 실제 .xlsx 파일을 읽는 xlsx(SheetJS) 라이브러리가 필요해서 파일이 나뉘어 있다.

// 헤더 행에서 키워드가 포함된 첫 열의 인덱스를 찾는다. exclude에 있는 인덱스는 건너뛴다
// (예: "메모" 열을 찾을 때, 이미 "내통장 메모" 열로 잡힌 인덱스는 제외해야 한다).
function findColumn(headerRow, keyword, exclude = []) {
	for (let i = 0; i < headerRow.length; i++) {
		if (exclude.includes(i)) continue;
		if (String(headerRow[i] ?? '').includes(keyword)) return i;
	}
	return -1;
}

// "2026-09-15 09:37:03", "2026.09.15", "2026/09/15 10:00" 등을 "2026-09-15"로 정리한다.
function toDateString(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const normalized = raw.slice(0, 10).replace(/[./]/g, '-');
	return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

// "4,400", "₩4400", 0, "" 등을 정리한다. 0이거나 비어있으면(그 거래가 입금/출금이 아니면) null.
function toAmount(value) {
	const num = Number(String(value ?? '').replace(/[₩,\s]/g, ''));
	return Number.isFinite(num) && num > 0 ? num : null;
}

// 은행에서 내려받은 파일은 표 위에 계좌번호·조회기간 같은 안내 줄이 먼저 나오고, 그 아래에
// "거래일시/거래종류/출금/입금/..." 헤더 행이 나온 다음 실제 내역이 이어지는 구조다.
// 헤더 행을 찾아 열 위치를 알아낸 다음, 그 아래 행들만 내역으로 파싱한다.
// rows는 시트를 2차원 배열로 바꾼 것(각 행 = 셀 값 배열).
export function parseLedgerXlsxRows(rows) {
	const headerRowIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? '').includes('거래일시')));
	if (headerRowIndex === -1) return [];

	const headerRow = rows[headerRowIndex];
	const idxDate = findColumn(headerRow, '거래일시');
	const idxType = findColumn(headerRow, '거래종류');
	const idxExpense = findColumn(headerRow, '출금');
	const idxIncome = findColumn(headerRow, '입금');
	const idxMemo1 = findColumn(headerRow, '내통장');
	const idxMemo2 = findColumn(headerRow, '메모', [idxMemo1]);
	const idxBranch = findColumn(headerRow, '거래점');

	if (idxDate === -1 || (idxIncome === -1 && idxExpense === -1)) return [];

	const entries = [];
	for (let i = headerRowIndex + 1; i < rows.length; i++) {
		const row = rows[i];
		const date = toDateString(row[idxDate]);
		if (!date) continue;

		const income = idxIncome >= 0 ? toAmount(row[idxIncome]) : null;
		const expense = idxExpense >= 0 ? toAmount(row[idxExpense]) : null;
		if (!income && !expense) continue; // 입출금이 둘 다 없으면 합계 줄 등 실제 거래가 아니다.

		const type = idxType >= 0 ? String(row[idxType] ?? '').trim() : '';
		const memo1 = idxMemo1 >= 0 ? String(row[idxMemo1] ?? '').trim() : '';
		const memo2 = idxMemo2 >= 0 ? String(row[idxMemo2] ?? '').trim() : '';
		const branch = idxBranch >= 0 ? String(row[idxBranch] ?? '').trim() : '';
		// 목적은 "내통장 메모"(직접 적어둔 별명)를 최우선으로, 없으면 "메모", 그것도 없으면 거래종류.
		const purpose = memo1 || memo2 || type || '(내용 없음)';

		const noteParts = [];
		if (memo2 && memo2 !== purpose) noteParts.push(memo2);
		if (type && type !== purpose) noteParts.push(type);
		if (branch) noteParts.push(branch);

		entries.push({ date, purpose, income, expense, notes: noteParts.join(' · ') });
	}

	return entries;
}

// 브라우저에서 고른 .xlsx 파일을 읽어서 위 파서에 넘긴다. xlsx 라이브러리는 크기가 있어서
// 실제로 파일을 고를 때만(이 함수가 호출될 때만) 동적 import로 불러온다.
export async function parseLedgerXlsxFile(file) {
	const XLSX = await import('xlsx');
	const buffer = await file.arrayBuffer();
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
	return parseLedgerXlsxRows(rows);
}
