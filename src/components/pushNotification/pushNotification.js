'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authedFetch } from '@/utils/authedFetch';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// base64url 형식의 VAPID 공개키를 pushManager.subscribe가 요구하는 Uint8Array로 변환
function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationToggle() {
	const [supported, setSupported] = useState(false);
	const [subscribed, setSubscribed] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
		setSupported(isSupported);

		if (!isSupported) return;

		navigator.serviceWorker.register('/sw.js').then((registration) => {
			registration.pushManager.getSubscription().then((sub) => {
				setSubscribed(!!sub);
			});
		});
	}, []);

	const onEnable = useCallback(async () => {
		if (!VAPID_PUBLIC_KEY) {
			toast.error('알림 설정이 아직 준비되지 않았습니다.');
			return;
		}

		setLoading(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				toast.warning('알림 권한이 거부되었습니다.');
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
			});

			const res = await authedFetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ subscription }),
			});

			if (!res.ok) throw new Error('구독 저장 실패');

			setSubscribed(true);
			toast.success('알림이 켜졌습니다.');
		} catch (error) {
			console.error(error);
			toast.error('알림 설정 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	}, []);

	const onDisable = useCallback(async () => {
		setLoading(true);
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				await authedFetch('/api/push/subscribe', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ endpoint: subscription.endpoint }),
				});
				await subscription.unsubscribe();
			}

			setSubscribed(false);
			toast.success('알림이 꺼졌습니다.');
		} catch (error) {
			console.error(error);
			toast.error('알림 해제 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	}, []);

	if (!supported) return null;

	return subscribed ? (
		<Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onDisable}>
			<Bell size={16} className="mr-1" /> 일정 알림 켜짐
		</Button>
	) : (
		<Button type="button" variant="outline" size="sm" disabled={loading} onClick={onEnable}>
			<BellOff size={16} className="mr-1" /> 일정 알림 켜기
		</Button>
	);
}
