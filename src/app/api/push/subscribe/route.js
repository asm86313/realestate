import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireUser, resolveOwnerId } from '@/lib/apiAuth';

// 브라우저의 푸시 구독 정보를 저장한다.
export async function POST(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { subscription } = await request.json();

	if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
		return new NextResponse(JSON.stringify({ message: '구독 정보가 올바르지 않습니다.' }), { status: 400 });
	}

	const { error } = await supabase.from('PushSubscriptions').upsert(
		{
			ownerId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
		},
		{ onConflict: ['endpoint'] }
	);

	if (error) {
		console.error('구독 저장 실패:', error);
		return new NextResponse(JSON.stringify({ message: '구독 저장에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '알림이 활성화되었습니다.' }), { status: 200 });
}

// 알림 끄기: 구독 해제 시 저장된 구독정보도 삭제
export async function DELETE(request) {
	const user = await requireUser(request);
	if (!user) {
		return new NextResponse(JSON.stringify({ message: '로그인이 필요합니다.' }), { status: 401 });
	}
	const ownerId = resolveOwnerId(user);

	const { endpoint } = await request.json();

	if (!endpoint) {
		return new NextResponse(JSON.stringify({ message: 'endpoint가 없습니다.' }), { status: 400 });
	}

	const { error } = await supabase.from('PushSubscriptions').delete().eq('endpoint', endpoint).eq('ownerId', ownerId);

	if (error) {
		console.error('구독 삭제 실패:', error);
		return new NextResponse(JSON.stringify({ message: '구독 해제에 실패했습니다.' }), { status: 500 });
	}

	return new NextResponse(JSON.stringify({ message: '알림이 해제되었습니다.' }), { status: 200 });
}
