import pool from '@/lib/db';

export async function GET(request) {

  const [Schedule] = await pool.query('SELECT * FROM Schedule ');
  console.log('Schedule', Schedule)
  Schedule.map(s => {
    s.title = s.description
  })

  return new Response(JSON.stringify({ Schedule }), { status: 200 });

}