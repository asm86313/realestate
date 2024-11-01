import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';  // 쿠키를 사용해 세션 관리
import pool from '../../../lib/db';

const SECRET_KEY = process.env.SECRET_KEY;  // 실제로는 환경 변수로 설정해야 합니다.

// 해시 포맷 확인 함수
function isHashValid(hashedPassword) {
	return typeof hashedPassword === 'string' && hashedPassword.length === 60 && hashedPassword.startsWith('$2');
}

// 비밀번호 해시 함수
async function hashPassword(password) {
	const saltRounds = 10;

	// 비밀번호가 문자열인지 확인
	if (typeof password !== 'string' || password.trim() === '') {
		throw new Error('Password must be a non-empty string');
	}

	try {
		const hashedPassword = await bcrypt.hash(password, saltRounds);
		return hashedPassword;
	} catch (error) {
		console.error('Error hashing password:', error);
		throw new Error('Hashing failed');
	}
}

export async function GET(request) {

	try {
		// 세션 확인: 쿠키에서 사용자 세션 정보 가져오기
		const cookies = request.cookies;
		const userSession = cookies.get('userData'); // 세션 이름에 맞춰 조정 필요

		if (!userSession) {
		  // 세션이 없다면 로그인 상태가 아니므로 401 응답 반환
		  return new NextResponse(JSON.stringify({ message: 'Not logged in' }), { status: 401 });
		}
		// 유효한 세션이면 사용자 정보를 반환
		return new Response(JSON.stringify({ message: 'Login successful', user: userSession }), { status: 200 });

	  } catch (error) {
		console.error('Error fetching session:', error);
		return new Response(JSON.stringify({ message: 'Error fetching session' }), { status: 500 });
	  }
}

export async function POST(request) {

	const { userId, password } = await request.json();

	const [result] = await pool.query('SELECT * FROM users WHERE userid = ?', [userId]);

	// 가상의 데이터베이스에서 사용자 조회 (실제 구현에서는 DB에서 사용자 정보를 가져와야 함)
	const user = {
		userId: result[0].userid,
	};

	if (isHashValid(result[0].password)) {
		user.passwordHash = result[0].password; // 해시된 비밀번호 그대로 사용
	} else {
		user.passwordHash = await hashPassword(result[0].password); // 비밀번호 해싱
	}

	// 사용자 이메일 확인
	if (userId !== user.userId) {
		return new Response(JSON.stringify({ message: '등록된 아이디가 없습니다.' }), { status: 401 });
	}

	// 비밀번호 해시 비교
	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
	if (!isPasswordValid) {
		return new Response(JSON.stringify({ message: '비밀번호가 틀립니다.' }), { status: 401 });
	}

	// JWT 생성 (로그인 성공 시)
	const userData = jwt.sign({ userId: user.userId }, SECRET_KEY, { expiresIn: '1h' });

	// JWT를 쿠키에 저장
	cookies().set('userData', userData, { httpOnly: true, secure: true, maxAge: 60 * 60 });

	return new Response(JSON.stringify({ message: 'Login successful', user: user }), { status: 200 });
}
