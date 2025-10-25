'use client';

import { Button } from '@/components/ui/button';
import { useAppKit } from '@reown/appkit/react';
import { useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';


export function WalletConnect({
}) {
	const { open } = useAppKit();
	const { address, isConnected } = useAccount();
	const { disconnect } = useDisconnect();


	const handleDisconnect = () => {
		disconnect();
	};

	if (isConnected && address) {
		return (
			<div className="flex items-center gap-3">
				<div className="rounded-lg bg-purple-500/10 px-4 py-2">
					<p className="text-sm text-purple-300">
						{address.slice(0, 6)}...{address.slice(-4)}
					</p>
				</div>
				<Button
					onClick={handleDisconnect}
					variant="outline"
					size="sm"
					className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 bg-transparent"
				>
					Disconnect
				</Button>
			</div>
		);
	}

	return (
		<Button
			onClick={() => open()}
			className="bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
		>
			Connect Wallet
		</Button>
	);
}
