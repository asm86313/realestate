'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Copy, KeyRound, LogOut, Mail, Save, ShieldCheck, Trash2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { codeToEmail } from '@/utils/familyCode';
import { authedFetch } from '@/utils/authedFetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AccountSettings() {
	const router = useRouter();
	const user = useAuthStore((state) => state.user);
	const [loginMode, setLoginMode] = useState('email'); // 'email' | 'familyCode'
	const [step, setStep] = useState('email'); // 'email' | 'otp'
	const [showFirstTime, setShowFirstTime] = useState(false); // 이름·초대코드 영역 펼침 여부
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [otp, setOtp] = useState('');
	const [inviteCode, setInviteCode] = useState('');
	const [familyLoginCode, setFamilyLoginCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [issuedCode, setIssuedCode] = useState('');
	const [issuing, setIssuing] = useState(false);
	const [profileName, setProfileName] = useState('');
	const [savingName, setSavingName] = useState(false);
	const [members, setMembers] = useState([]);
	const [membersLoading, setMembersLoading] = useState(false);

	const isOwner = user?.user_metadata?.role === 'owner';

	useEffect(() => {
		setProfileName(user?.user_metadata?.name || '');
	}, [user]);

	const loadMembers = useCallback(async () => {
		setMembersLoading(true);
		try {
			const res = await authedFetch('/api/invite/list');
			const result = await res.json();
			setMembers(result.members || []);
		} catch (err) {
			toast.error('가족회원 목록을 불러오지 못했습니다.');
		} finally {
			setMembersLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOwner) loadMembers();
	}, [isOwner, loadMembers]);

	const resetForm = useCallback(() => {
		setStep('email');
		setEmail('');
		setName('');
		setOtp('');
		setInviteCode('');
		setShowFirstTime(false);
	}, []);

	const onSendOtp = useCallback(async () => {
		if (!email) {
			toast.warning('이메일을 입력해주세요.');
			return;
		}
		setLoading(true);
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				shouldCreateUser: true,
				data: name ? { name } : undefined,
			},
		});
		setLoading(false);

		if (error) {
			toast.error(`인증코드 발송에 실패했습니다: ${error.message}`);
			return;
		}
		toast.success('이메일로 인증코드를 보냈습니다.');
		setStep('otp');
	}, [email, name]);

	const onVerifyOtp = useCallback(async () => {
		if (!otp) {
			toast.warning('인증코드를 입력해주세요.');
			return;
		}
		setLoading(true);
		const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });

		if (error) {
			setLoading(false);
			toast.error('인증코드가 올바르지 않거나 만료되었습니다.');
			return;
		}

		// 신규 가입(방금 처음 생성된 계정)인 경우에만 초대코드를 검사한다.
		const isNewUser = Math.abs(new Date(data.user.created_at) - new Date(data.user.last_sign_in_at)) < 5000;

		let loggedInUser = data.user;

		if (isNewUser) {
			try {
				const res = await authedFetch('/api/invite/redeem', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code: inviteCode, email }),
				});
				const result = await res.json();

				if (!result.ok) {
					await supabase.auth.signOut();
					setLoading(false);
					toast.error(result.message || '초대코드가 필요합니다.');
					return;
				}

				// 초대코드 없이 가입 = 새로운 가족의 대표, 초대코드로 가입 = 그 가족의 구성원.
				// 실제 소속은 서버가 FamilyMembers에 이미 기록했다. 여기서 넣는 role은
				// 화면 표시용(초대코드 발급 UI 노출 여부)일 뿐이라 권한 근거로 쓰이지 않는다.
				const { data: updated } = await supabase.auth.updateUser({
					data: { role: result.bootstrap ? 'owner' : 'member' },
				});
				if (updated?.user) loggedInUser = updated.user;
			} catch (err) {
				await supabase.auth.signOut();
				setLoading(false);
				toast.error('초대코드 확인 중 오류가 발생했습니다.');
				return;
			}
		}

		setLoading(false);
		useAuthStore.getState().setUser(loggedInUser);
		toast.success('로그인되었습니다.');
		resetForm();
	}, [email, otp, inviteCode, resetForm]);

	const onFamilyCodeLogin = useCallback(async () => {
		if (!familyLoginCode) {
			toast.warning('가족코드를 입력해주세요.');
			return;
		}
		setLoading(true);
		const code = familyLoginCode.trim();
		const { data, error } = await supabase.auth.signInWithPassword({
			email: codeToEmail(code),
			password: code,
		});

		if (error) {
			setLoading(false);
			toast.error('가족코드가 올바르지 않습니다.');
			return;
		}

		// 가족대표가 삭제(폐기)한 코드인지 확인
		try {
			const res = await authedFetch('/api/invite/check', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			const result = await res.json();
			if (result.revoked) {
				await supabase.auth.signOut();
				setLoading(false);
				toast.error('삭제된 가족코드입니다.');
				return;
			}
		} catch (err) {
			// 확인 실패 시에는 로그인을 막지 않는다 (네트워크 문제 등으로 정상 사용자가 막히지 않도록)
		}

		setLoading(false);
		useAuthStore.getState().setUser(data.user);
		toast.success('로그인되었습니다.');
		setFamilyLoginCode('');
	}, [familyLoginCode]);

	const onLogout = useCallback(async () => {
		await supabase.auth.signOut();
		useAuthStore.getState().clearUser();
		toast.success('로그아웃되었습니다.');
	}, []);

	const onCreateInvite = useCallback(async () => {
		setIssuing(true);
		try {
			const res = await authedFetch('/api/invite/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: user?.email }),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.message);
			setIssuedCode(result.code);
			loadMembers();
		} catch (err) {
			toast.error('초대코드 발급에 실패했습니다.');
		} finally {
			setIssuing(false);
		}
	}, [user, loadMembers]);

	const onCopyInvite = useCallback(() => {
		navigator.clipboard.writeText(issuedCode);
		toast.success('초대코드를 복사했습니다.');
	}, [issuedCode]);

	const onSaveName = useCallback(async () => {
		setSavingName(true);
		try {
			const { data, error } = await supabase.auth.updateUser({ data: { name: profileName } });
			if (error) throw error;
			useAuthStore.getState().setUser(data.user);

			// 가족회원 계정이면 대표가 보는 목록에도 이름을 동기화한다.
			const myCode = user?.user_metadata?.code;
			if (myCode) {
				await authedFetch('/api/invite/sync-name', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code: myCode, name: profileName }),
				});
			}
			toast.success('이름을 저장했습니다.');
		} catch (err) {
			toast.error('이름 저장에 실패했습니다.');
		} finally {
			setSavingName(false);
		}
	}, [profileName, user]);

	const onRemoveMember = useCallback(async (code) => {
		try {
			const res = await authedFetch('/api/invite/revoke', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!res.ok) throw new Error();
			toast.success('가족회원을 삭제했습니다.');
			loadMembers();
		} catch (err) {
			toast.error('가족회원 삭제에 실패했습니다.');
		}
	}, [loadMembers]);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-2 py-4 sm:px-4">
			<div className="flex items-center gap-2">
				<Button type="button" variant="ghost" size="icon" onClick={() => router.push('/settings')}>
					<ArrowLeft className="size-4" />
				</Button>
				<h1 className="text-xl font-bold tracking-tight sm:text-2xl">계정관리</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">계정</CardTitle>
					{!user && <CardDescription>이메일 인증코드 또는 가족코드로 로그인합니다.</CardDescription>}
				</CardHeader>
				<CardContent>
					{user ? (
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
									<UserIcon className="size-5" />
								</div>
								<div className="min-w-0">
									<p className="truncate font-medium">{user.user_metadata?.name || user.email}</p>
									<p className="truncate text-sm text-muted-foreground">{user.email}</p>
								</div>
							</div>
							<Button type="button" variant="outline" className="gap-1.5" onClick={onLogout}>
								<LogOut className="size-4" /> 로그아웃
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="flex gap-2">
								<Button
									type="button"
									variant={loginMode === 'email' ? 'default' : 'outline'}
									size="sm"
									className="flex-1"
									onClick={() => setLoginMode('email')}
								>
									이메일로 로그인
								</Button>
								<Button
									type="button"
									variant={loginMode === 'familyCode' ? 'default' : 'outline'}
									size="sm"
									className="flex-1"
									onClick={() => setLoginMode('familyCode')}
								>
									가족코드로 로그인
								</Button>
							</div>

							{loginMode === 'familyCode' ? (
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-1.5">
										<Label>가족코드</Label>
										<Input
											value={familyLoginCode}
											placeholder="예: AB12CD34"
											onChange={(e) => setFamilyLoginCode(e.target.value.toUpperCase())}
											onKeyDown={(e) => e.key === 'Enter' && onFamilyCodeLogin()}
										/>
									</div>
									<Button type="button" className="gap-1.5" disabled={loading} onClick={onFamilyCodeLogin}>
										<KeyRound className="size-4" /> 로그인
									</Button>
								</div>
							) : step === 'email' ? (
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-1.5">
										<Label>이메일</Label>
										<Input
											type="email"
											value={email}
											placeholder="이메일"
											onChange={(e) => setEmail(e.target.value)}
											onKeyDown={(e) => e.key === 'Enter' && onSendOtp()}
										/>
									</div>

									{/* 이름/초대코드는 신규 가입 때만 쓰이므로 기본으로 접어둔다.
									    초대코드를 비우면 새 가족의 대표로, 채우면 그 가족의 구성원으로 가입한다. */}
									<button
										type="button"
										className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
										onClick={() => setShowFirstTime((v) => !v)}
									>
										<ChevronDown className={`size-4 transition-transform ${showFirstTime ? 'rotate-180' : ''}`} />
										처음이신가요?
									</button>

									{showFirstTime && (
										<div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
											<div className="flex flex-col gap-1.5">
												<Label>이름</Label>
												<Input value={name} placeholder="이름" onChange={(e) => setName(e.target.value)} />
											</div>
											<div className="flex flex-col gap-1.5">
												<Label>초대코드</Label>
												<Input
													value={inviteCode}
													placeholder="예: AB12CD34"
													onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
												/>
												<p className="text-xs text-muted-foreground">
													가족에게 받은 코드가 있으면 입력하세요. 비워두면 새로 시작합니다.
												</p>
											</div>
										</div>
									)}

									<Button type="button" className="gap-1.5" disabled={loading} onClick={onSendOtp}>
										<Mail className="size-4" /> 인증코드 받기
									</Button>
								</div>
							) : (
								<div className="flex flex-col gap-3">
									<p className="text-sm text-muted-foreground">
										<span className="font-medium text-foreground">{email}</span>로 인증코드를 보냈습니다.
									</p>
									<div className="flex flex-col gap-1.5">
										<Label>인증코드</Label>
										<Input
											inputMode="numeric"
											maxLength={8}
											value={otp}
											placeholder="12345678"
											onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
											onKeyDown={(e) => e.key === 'Enter' && onVerifyOtp()}
										/>
									</div>
									<div className="flex gap-2">
										<Button type="button" className="flex-1 gap-1.5" disabled={loading} onClick={onVerifyOtp}>
											<ShieldCheck className="size-4" /> 확인
										</Button>
										<Button type="button" variant="secondary" className="flex-1" disabled={loading} onClick={resetForm}>
											이메일 다시 입력
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{user && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">이름</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
						<div className="flex flex-1 flex-col gap-1.5">
							<Label>이름</Label>
							<Input value={profileName} placeholder="이름" onChange={(e) => setProfileName(e.target.value)} />
						</div>
						<Button type="button" className="gap-1.5" disabled={savingName} onClick={onSaveName}>
							<Save className="size-4" /> 저장
						</Button>
					</CardContent>
				</Card>
			)}

			{user && isOwner && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">가족코드</CardTitle>
						<CardDescription>발급한 코드를 가족에게 알려주면, 그 코드만 입력해서 바로 로그인할 수 있어요.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{issuedCode ? (
							<div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
								<span className="font-mono text-lg font-semibold tracking-widest">{issuedCode}</span>
								<Button type="button" variant="ghost" size="icon" onClick={onCopyInvite}>
									<Copy className="size-4" />
								</Button>
							</div>
						) : null}
						<Button type="button" variant="outline" className="gap-1.5 self-start" disabled={issuing} onClick={onCreateInvite}>
							<KeyRound className="size-4" /> 초대코드 발급
						</Button>
					</CardContent>
				</Card>
			)}

			{user && isOwner && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">가족회원 관리</CardTitle>
						<CardDescription>발급했던 가족코드 목록이에요. 삭제하면 그 코드로는 더 이상 로그인할 수 없어요.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{membersLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
						{!membersLoading && members.length === 0 && (
							<p className="text-sm text-muted-foreground">아직 발급한 가족코드가 없어요.</p>
						)}
						{members.map((m) => (
							<div key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{m.memberName || '(이름 미설정)'}
										{m.revoked && <span className="ml-2 text-xs text-destructive">삭제됨</span>}
									</p>
									<p className="truncate font-mono text-xs text-muted-foreground">{m.code}</p>
								</div>
								{!m.revoked && (
									<Button type="button" variant="ghost" size="icon" onClick={() => onRemoveMember(m.code)}>
										<Trash2 className="size-4 text-destructive" />
									</Button>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
