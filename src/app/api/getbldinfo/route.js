import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// Next.js가 서버 fetch를 기본 캐싱하지 않도록 매 요청 새로 실행되게 강제한다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await requireUser(request);
  if (!user) {
    return new Response(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
  }
  const ownerId = await resolveOwnerId(user);

  // 내 가족(워크스페이스) 소유의 건물만 가져오기
  const { data: Buildings, error: buildingsError } = await supabaseAdmin
    .from('Buildings')
    .select('*')
    .eq('ownerId', ownerId);

  if (buildingsError) {
    return new Response(JSON.stringify({ error: buildingsError.message }), { status: 500 });
  }

  // 그 건물들에 딸린 계약만 가져오기 (Contracts엔 ownerId가 없으므로 bldId로 연결해서 거른다)
  const bldIds = Buildings.map((b) => b.id);
  let Contracts = [];
  if (bldIds.length > 0) {
    const { data, error: contractsError } = await supabaseAdmin.from('Contracts').select('*').in('bldId', bldIds);

    if (contractsError) {
      return new Response(JSON.stringify({ error: contractsError.message }), { status: 500 });
    }
    Contracts = data;
  }

  return new Response(JSON.stringify({ Buildings, Contracts }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
