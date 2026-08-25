import dayjs from 'dayjs';

// "이자 매일 자동 계산"이 체크된 내역은 저장된 interestAmount를 안 믿고, 볼 때마다
// 오늘 날짜 기준으로 다시 계산한다 (오늘 - 날짜 = 빌린일수, 단리로 이자 계산).
// 그래서 이 값은 매일 자동으로 달라진다 - 체크 안 된 내역은 저장된 값을 그대로 쓴다
// (이미 지급 완료된 이자처럼, 날짜가 지나도 안 불어나야 하는 확정값).
export function liveInterestAmount(row) {
	if (!row?.interestAuto) return Number(row?.interestAmount || 0);
	if (!row?.interestRate || !row?.date) return 0;

	const income = Number(row.income || 0);
	const expense = Number(row.expense || 0);
	const principal = expense > 0 ? expense : income;
	if (!principal) return 0;

	const days = dayjs().startOf('day').diff(dayjs(row.date).startOf('day'), 'day');
	if (days <= 0) return 0;

	return Math.round(principal * (Number(row.interestRate) / 100) * (days / 365));
}

// 장부 한 줄이 요약표(카테고리)에 잡힐 금액을 계산한다.
// 요약표는 "총 비용"처럼 지출 항목들을 모아 더하는 용도라, 입금/출금 여부와 상관없이
// 전부 양수로 더한다(출금이라고 마이너스로 상쇄하지 않는다) - 원금 + 이자(liveInterestAmount)를 합산.
// 입금/출금이 둘 다 채워진 줄(예: 입금=출금으로 양쪽에 같은 금액을 넣어둔 이자 내역)은
// 목록 화면과 같은 규칙으로 출금을 우선한다 - 안 그러면 같은 금액이 두 번 더해진다.
// 참고: 장부 자체의 잔액(입금-출금)은 ledger.js에서 따로 계산하고, 여기엔 영향 없다.
export function ledgerRowAmount(row) {
	const income = Number(row?.income || 0);
	const expense = Number(row?.expense || 0);
	const interest = liveInterestAmount(row);
	const base = expense > 0 ? expense : income;

	return base + interest;
}
