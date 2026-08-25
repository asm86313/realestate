'use client'; // 클라이언트 전용으로 설정

import { usePathname, useRouter } from 'next/navigation';
import { Home, Building, Calendar, Wallet, Settings } from 'lucide-react';

import css from './bottomNav.module.css';

const items = [
	{ title: '대시보드', url: '/', icon: Home },
	{ title: '건물리스트', url: '/rsms', icon: Building },
	{ title: '일정', url: '/calendar', icon: Calendar },
	{ title: '회계', url: '/ledger', icon: Wallet },
	{ title: '설정', url: '/settings', icon: Settings },
];

export default function BottomNav() {
	const pathname = usePathname();
	const router = useRouter();

	return (
		<nav className={css.bottomNav}>
			<div className={css.navList}>
				{items.map((item) => {
					const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);

					return (
						<button
							key={item.url}
							type="button"
							className={`${css.navItem} ${isActive ? css.active : ''}`}
							onClick={() => router.push(item.url)}
						>
							<item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
							<span>{item.title}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
