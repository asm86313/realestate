import { supabase } from '@/lib/supabase';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Buildings 테이블 가져오기
  const { data: Buildings, error: buildingsError } = await supabase.from('Buildings').select('*');

  if (buildingsError) {
    return new Response(JSON.stringify({ error: buildingsError.message }), { status: 500 });
  }

  // Contracts 테이블 가져오기
  const { data: Contracts, error: contractsError } = await supabase.from('Contracts').select('*');

  if (contractsError) {
    return new Response(JSON.stringify({ error: contractsError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ Buildings, Contracts }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
