import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
	return (
		<div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3">
			<Loader2 className="size-8 animate-spin text-muted-foreground" />
			<p className="text-sm text-muted-foreground">데이터 로딩중...</p>
		</div>
	);
}
