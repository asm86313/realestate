'use client'; // 클라이언트 전용으로 설정

import { useCallback, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

import { Calendar, Home, Search, CircleUser } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger  } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { login, signup, logout } from "@/utils/core";

import css from "./appHeader.module.css";

export const loginForm = (item) => {
	const [userId, setUserId] = useState('');
	const [userPassword, setUserPassword] = useState('');
	const [userName, setUserName] = useState('');
	const [isRegMode, setRegMode] = useState(false);
	const [isOpen, setOpen] = useState(false);

	const onClickLogin = useCallback(()=> {

	}, [userId, userPassword]);

	const onClickRegUser = useCallback(()=> {
		setRegMode(true);
	}, []);

	const onOpenChange = useCallback((open)=> {
		if (!open) return;
		setOpen(open);
		initUserInfo();
	}, []);

	const initUserInfo = useCallback(()=> {
		setUserId('');
		setUserPassword('');
		setUserName('');
	}, []);

	useEffect(()=> {
		initUserInfo();
	}, [isRegMode]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
  			<DialogTrigger>
				<item.icon className={css.icon} size='48px' name={item.title} />
  				<div className={css.title}>{item.title}</div>
			</DialogTrigger>
  			<DialogContent>
    			<DialogHeader>
					<DialogTitle>{isRegMode ? '회원가입' : '로그인'}</DialogTitle>
    			</DialogHeader>
					{isRegMode ?
						<div className={"grid items-start gap-4"}>
							<div className="grid gap-2">
								<Label className={css.label}>아이디</Label>
								<Input type="text" value={userId} placeholder="아이디를 입력하세요" onChange={(e) => setUserId(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>이름</Label>
								<Input type="text" value={userId} placeholder="이름 입력하세요" onChange={(e) => setUserName(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>비밀번호</Label>
								<Input type="password" value={userPassword} placeholder="비밀번호를 입력하세요" onChange={(e) => setUserPassword(e.target.value)}/>
							</div>
							<Button type='button' onClick={onClickLogin} >저장</Button>
							<Button type='button' onClick={onClickRegUser} >취소</Button>
						</div> :
						<div className={"grid items-start gap-4"}>
							<div className="grid gap-2">
								<Label className={css.label}>아이디</Label>
								<Input type="text" value={userId} placeholder="아이디를 입력하세요" onChange={(e) => setUserId(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>비밀번호</Label>
								<Input type="password" value={userPassword} placeholder="비밀번호를 입력하세요" onChange={(e) => setUserPassword(e.target.value)}/>
							</div>
							<Button type='button' onClick={onClickLogin} >로그인</Button>
							<Button type='button' onClick={onClickRegUser} >회원가입</Button>
						</div>
					}
  			</DialogContent>
		</Dialog>
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
			title: "로그인",
			url: "#",
			icon: CircleUser,
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
			<div className={css.content}>
				{items.map((item, index) => {
					return item.title !== "로그인" &&
						<div key={item.title + index}>
							<item.icon className={css.icon} size='48px' onClick={() => onClickButton(item.title)}/>
							<div className={css.title}>{item.title}</div>
						</div>
				})}
			</div>
			<div className={css.content1}>
				{items.map((item, index) => {
					return item.title === "로그인" &&
						<div key={item.title + index}>{loginForm(item)}</div>
					})}
			</div>
		</div>
	)
}
