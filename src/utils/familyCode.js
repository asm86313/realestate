// 가족코드 문자열로부터 결정적으로(항상 같은 값) 로그인용 가짜 이메일을 만든다.
// 실제 메일함이 아니라 Supabase Auth 계정을 구분하기 위한 식별자로만 쓰인다.
// 서버(API 라우트)와 클라이언트(설정 화면) 양쪽에서 같은 규칙을 써야 하므로 공용 유틸로 분리.
export function codeToEmail(code) {
	return `family-${code.trim().toLowerCase()}@familycode.internal`;
}
