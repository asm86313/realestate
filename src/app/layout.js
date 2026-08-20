import "./globals.css";
import ClientLayout from "@/components/layout";
import css from "./layout.module.css";
import BottomNav from "@/components/bottomNav/bottomNav";

export const metadata = {
	title: "부동산 관리",
	description: "부동산 임대 관리 웹앱",
	manifest: "/manifest.json",
	icons: {
		icon: "/icon-192.png",
		apple: "/icon-192.png",
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "부동산 관리",
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	viewportFit: "cover",
	themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
	return (
		<html>
			<head>
				{/* 한글에 최적화된 얇고 정갈한 느낌의 웹폰트 */}
				<link
					rel="stylesheet"
					as="style"
					crossOrigin="anonymous"
					href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
				/>
			</head>
			<body>
				<main className={css.main}>
					<div className={css.mainLayout}>
						<div className={css.mainContainer}>
							<ClientLayout>
								{children}
							</ClientLayout>
						</div>
					</div>
				</main>
				<BottomNav/>
			</body>
		</html>
	);
}
