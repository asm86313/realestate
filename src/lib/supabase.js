import { createClient } from '@supabase/supabase-js';

// 주의: Next.js는 브라우저 번들에 NEXT_PUBLIC_* 값을 넣어줄 때
// `process.env.NEXT_PUBLIC_XXX` 처럼 점(dot) 표기로 직접 접근하는 경우만 치환해준다.
// `const { NEXT_PUBLIC_XXX } = process.env` 같은 구조분해할당은 치환되지 않아
// 브라우저에서 undefined가 되므로 반드시 아래처럼 직접 접근해야 한다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
