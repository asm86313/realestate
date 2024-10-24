import pool from '../../../lib/db';

export async function GET(request) {

  const [Buildings] = await pool.query('SELECT * FROM Buildings');
  const [Contracts] = await pool.query('SELECT * FROM Contracts');
  console.log(Buildings, Contracts)
  return new Response(JSON.stringify({ Buildings, Contracts }), { status: 200 });

}