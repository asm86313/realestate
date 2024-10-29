'use client'; // 클라이언트 전용으로 설정

import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"
import { useRouter } from 'next/navigation';
import css from "./appHeader.module.css";
import { useCallback } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export const sheet = (item) => {
	return (
		<Sheet>
			<SheetTrigger>
				<item.icon className={css.icon} size='48px' name={item.title} />
				<div className={css.title}>{item.title}</div>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Are you absolutely sure?</SheetTitle>
					<SheetDescription>
						This action cannot be undone. This will permanently delete your account
						and remove your data from our servers.
					</SheetDescription>
				</SheetHeader>
			</SheetContent>
		</Sheet>
	)
}


export default function AppHeader({}) {
	const router = useRouter();
	// Menu items.
	const items = [
		{
			title: "홈",
			url: "#",
			icon: Home,
		},
		{
			title: "달력",
			url: "#",
			icon: Calendar,
		},
		{
			title: "검색",
			url: "#",
			icon: Search,
		},
		{
			title: "설정",
			url: "#",
			icon: Settings,
		}
	]
	const onClickButton =  useCallback((title)=>{
		console.log(title)
		if (title === '홈') {
			router.push("/rsms");
		}
		if (title === '달력') {
			router.push("/calendar");
		}
	},[])

	return (
		<div className={css.header}>
			{items.map((item, index) => {
				return item.title === "설정" ?
				<div key={item.title + index}>{sheet(item)}
				</div> :
				<div key={item.title + index}>
					<item.icon className={css.icon} size='48px' onClick={() => onClickButton(item.title)}/>
					<div className={css.title}>{item.title}</div>
				</div>
			})}
		</div>
	)
}
