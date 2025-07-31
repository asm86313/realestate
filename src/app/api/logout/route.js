import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('로그아웃 실패:', error);
  } else {
    console.log('로그아웃 성공');
  }

  return new NextResponse(JSON.stringify({ message: 'Logged out successfully' }), { status: 200 });
}
