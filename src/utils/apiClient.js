import axios from 'axios';
import { supabase } from '@/lib/supabase';

// 우리 앱 API(/api/*) 전용 axios 인스턴스.
// 요청마다 현재 로그인 세션의 access_token을 Authorization 헤더로 자동으로 붙여서
// 서버(API 라우트)가 로그인 여부를 검증할 수 있게 한다.
const apiClient = axios.create();

apiClient.interceptors.request.use(async (config) => {
	const { data } = await supabase.auth.getSession();
	const token = data?.session?.access_token;

	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

export default apiClient;
