'use client'; // 클라이언트 전용으로 설정

import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from 'next/navigation';

import { setUserData } from "@/app/slices/storeSlice";

import { Calendar, Home, CircleUser, Building, LogIn, LogOut, Menu } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger  } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { login, signup, logout, getUser } from "@/utils/core";

import css from "./appHeader.module.css";

export const loginForm = (dispatch) => {

	const [userId, setUserId] = useState('');
	const [userPassword, setUserPassword] = useState('');
	const [userName, setUserName] = useState('');
	const [email, setEmail] = useState('');
	const [isRegMode, setRegMode] = useState(false);
	const [isOpen, setOpen] = useState(false);

	const onClickLogin = useCallback(async ()=> {
		let res = await login(userId, userPassword)
		if (res) {
			// let userData = await getUser();
			// if (userData) {
			// 	console.log(userData)
			// 	dispatch(userData.data.user)
			// }
			setOpen(false);
		}
	}, [userId, userPassword]);

	const onRegUser = useCallback(()=> {
		signup(userId, userName, email, userPassword)
	}, [userId, userName, email, userPassword]);

	const onClickRegUser = useCallback(()=> {
		setRegMode(true);
	}, []);

	const onOpenChange = useCallback((open)=> {
		if(!open) setRegMode(false);
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

	// useEffect(async ()=> {
	// 	let res = await getUser()
	// 	if (res) {
	// 		dispatch(res.data.user)
	// 		console.log(res)
	// 	}
	// }, []);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
  			<DialogTrigger>
			  <TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
								<LogIn className={css.icon} size='36px' name={'로그인'} />
								</TooltipTrigger>
								<TooltipContent>
									<p>{'로그인'}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
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
								<Label className={css.label}>비밀번호</Label>
								<Input type="password" value={userPassword} placeholder="비밀번호를 입력하세요" onChange={(e) => setUserPassword(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>이름</Label>
								<Input type="text" value={userName} placeholder="이름 입력하세요" onChange={(e) => setUserName(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>이메일</Label>
								<Input type="text" value={email} placeholder="이메일 주소를 입력하세요" onChange={(e) => setEmail(e.target.value)}/>
							</div>
							<Button type='button' onClick={onRegUser} >저장</Button>
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

export const accountInfo = () => {
	const [userId, setUserId] = useState('');
	const [userPassword, setUserPassword] = useState('');
	const [userName, setUserName] = useState('');
	const [email, setEmail] = useState('');
	const [isRegMode, setRegMode] = useState(false);
	const [isOpen, setOpen] = useState(false);

	const onClickLogin = useCallback(async ()=> {
		let res = await login(userId, userPassword)
	}, [userId, userPassword]);

	const onRegUser = useCallback(()=> {
		signup(userId, userName, email, userPassword)
	}, [userId, userName, email, userPassword]);

	const onClickRegUser = useCallback(()=> {
		setRegMode(true);
	}, []);

	const onOpenChange = useCallback((open)=> {
		if(!open) setRegMode(false);
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
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
  			<SheetTrigger>
			  	<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<CircleUser className={css.icon} size='36px' name={'계정정보'} />
						</TooltipTrigger>
						<TooltipContent>
							<p>{'계정정보'}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SheetTrigger>
  			<SheetContent>
    			<SheetHeader>
					<SheetTitle>{isRegMode ? '회원가입' : '로그인'}</SheetTitle>
    			</SheetHeader>
					{isRegMode ?
						<div className={"grid items-start gap-4"}>
							<div className="grid gap-2">
								<Label className={css.label}>아이디</Label>
								<Input type="text" value={userId} placeholder="아이디를 입력하세요" onChange={(e) => setUserId(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>비밀번호</Label>
								<Input type="password" value={userPassword} placeholder="비밀번호를 입력하세요" onChange={(e) => setUserPassword(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>이름</Label>
								<Input type="text" value={userName} placeholder="이름 입력하세요" onChange={(e) => setUserName(e.target.value)}/>
							</div>
							<div className="grid gap-2">
								<Label className={css.label}>이메일</Label>
								<Input type="text" value={email} placeholder="이메일 주소를 입력하세요" onChange={(e) => setEmail(e.target.value)}/>
							</div>
							<Button type='button' onClick={onRegUser} >저장</Button>
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
  			</SheetContent>
		</Sheet>
	)
}

export default function AppHeader({}) {
	const router = useRouter();
	const dispatch = useDispatch();
	const [isLogin, setLogin] = useState(false);

	// Menu items.
	const items = [
		{
			title: "홈",
			url: "/",
			icon: Home,
		},
		{
			title: "건물리스트",
			url: "/rsms",
			icon: Building,
		},
		{
			title: "일정",
			url: "/calendar",
			icon: Calendar,
		}
	]

	return (
		<div className={css.header}>
			<div className={css.contentLeft}>
				<div className={css.iconWrap} >
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Menu className={css.icon} size='36px'/>
							</TooltipTrigger>
							<TooltipContent>
								<p>메뉴</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			<div className={css.contentCenter}>
				{items.map((item, index) => {
					return (item.title !== "로그인" && item.title !== "로그아웃") &&
						<div className={css.iconWrap} key={item.title + index}>
							<TooltipProvider>
  								<Tooltip>
    								<TooltipTrigger asChild>
										<item.icon className={css.icon} size='36px' onClick={() => router.push(item.url)}/>
									</TooltipTrigger>
    								<TooltipContent>
      									<p>{item.title}</p>
    								</TooltipContent>
  								</Tooltip>
							</TooltipProvider>
						</div>
					})
				}
			</div>
			<div className={css.contentRight}>
				{!isLogin ?	loginForm(dispatch) :
					<>
						<div className={css.iconWrap}>
						 	{accountInfo()}
						</div>
						<div className={css.iconWrap}>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<LogOut className={css.icon} size='36px' onClick={() => logout()}/>
									</TooltipTrigger>
									<TooltipContent>
										<p>{'로그아웃'}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</>
				}
			</div>
		</div>
	)
}
