import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '../../../lib/db';

export async function POST(request) {
  const { userId, password, userName, email } = await request.json();

  // 비밀번호 해싱
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    // SQL 쿼리 실행 - 데이터 저장
    const [result] = await pool.query(
     `INSERT INTO users
      (id, userId, password, email, name)
      VALUES (null, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      userId = VALUES(userId),
      password = VALUES(password),
      email = VALUES(email),
      name = VALUES(name)`,
    [userId, hashedPassword, email, userName]);

    // 성공 메시지 응답
    return new NextResponse(JSON.stringify({ message: '회원가입 성공' }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error saving user:', error);
    return new NextResponse(JSON.stringify({ message: '회원가입 실패' }), {
      status: 500,
    });
  }
}
