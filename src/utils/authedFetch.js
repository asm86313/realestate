'use client';

import { supabase } from '@/lib/supabase';

// fetch()에 현재 로그인 세션의 access_token을 Authorization 헤더로 자동으로 붙여준다.
export async function authedFetch(url, options = {}) {
	const { data } = await supabase.auth.getSession();
	const token = data?.session?.access_token;

	const headers = { ...(options.headers || {}) };
	if (token) headers.Authorization = `Bearer ${token}`;

	return fetch(url, { ...options, headers });
}
