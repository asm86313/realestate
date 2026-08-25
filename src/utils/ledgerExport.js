// 지금 화면에 보이는 장부 내역을 CSV로 내려받는다 - 엑셀에서 바로 열림.
// 별도 라이브러리(xlsx 등) 없이도 엑셀이 .csv를 그대로 열어준다.

function escapeCsvField(value) {
	const s = value === null || value === undefined ? '' : String(value);
	if (/[",\n]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function downloadLedgerCsv(rows, { reportTitleById, accountNameById }, filename) {
	const header = ['날짜', '목적', '카테고리', '통장', '입금', '출금', '금리(%)', '이자', '빌린일수', '비고'];

	const lines = rows.map((row) => [
		row.date || '',
		row.purpose || '',
		row.reportId ? reportTitleById.get(row.reportId) || '' : '',
		row.bankAccountId ? accountNameById.get(row.bankAccountId) || '' : '',
		row.income ?? '',
		row.expense ?? '',
		row.interestRate ?? '',
		row.interestAmount ?? '',
		row.borrowedDays ?? '',
		row.notes || '',
	]);

	const csv = [header, ...lines].map((cols) => cols.map(escapeCsvField).join(',')).join('\r\n');

	// 앞에 BOM을 붙여야 엑셀이 한글을 UTF-8로 올바르게 인식한다.
	const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
