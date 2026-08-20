'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Repeat, Wallet, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PushNotificationToggle from '@/components/pushNotification/pushNotification';

export default function Settings() {
	const router = useRouter();
	const user = useAuthStore((state) => state.user);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">설정</h1>
				<p className="text-sm text-muted-foreground">계정과 알림을 관리하세요.</p>
			</div>

			<Card
				className="cursor-pointer transition-colors hover:border-primary/50 active:bg-accent"
				onClick={() => router.push('/settings/account')}
			>
				<CardContent className="flex items-center gap-3 p-4 sm:p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<UserIcon className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium">계정관리</p>
						<p className="truncate text-sm text-muted-foreground">
							{user ? (user.user_metadata?.name || user.email) : '로그인, 가족코드, 가족회원 관리'}
						</p>
					</div>
					<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
				</CardContent>
			</Card>

			<Card
				className="cursor-pointer transition-colors hover:border-primary/50 active:bg-accent"
				onClick={() => router.push('/settings/schedule')}
			>
				<CardContent className="flex items-center gap-3 p-4 sm:p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Repeat className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium">일정관리</p>
						<p className="truncate text-sm text-muted-foreground">매월 반복되는 일정을 자동으로 등록해요</p>
					</div>
					<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
				</CardContent>
			</Card>

			<Card
				className="cursor-pointer transition-colors hover:border-primary/50 active:bg-accent"
				onClick={() => router.push('/settings/ledger')}
			>
				<CardContent className="flex items-center gap-3 p-4 sm:p-4">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Wallet className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium">회계 관리</p>
						<p className="truncate text-sm text-muted-foreground">매월 반복되는 장부 항목을 자동으로 등록해요</p>
					</div>
					<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">알림</CardTitle>
					<CardDescription>오늘 예정된 일정을 푸시 알림으로 받아보세요.</CardDescription>
				</CardHeader>
				<CardContent>
					<PushNotificationToggle/>
				</CardContent>
			</Card>
		</div>
	);
}
