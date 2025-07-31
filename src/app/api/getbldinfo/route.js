// import pool from '../../../lib/db';

// export async function GET(request) {

	

// 	const [Buildings] = await pool.query('SELECT * FROM Buildings');
// 	const [Contracts] = await pool.query('SELECT * FROM Contracts');

// 	return new Response(JSON.stringify({ Buildings, Contracts }), { status: 200 });

// }

// app/api/your-route/route.js (또는 route.ts)

import { supabase } from '@/lib/supabase'; // lib/supabaseClient.js 에서 export된 클라이언트

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