import React, { useMemo } from 'react';
//import './App.css';

import OrcaSwap from './OrcaSwap';
import { SnackbarProvider } from 'notistack';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

import { WalletDialogProvider, WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-material-ui';

import {
  //LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
  //CloverWalletAdapter,
  //MathWalletAdapter,
  //Coin98WalletAdapter,
  //SolongWalletAdapter,
} from '@solana/wallet-adapter-wallets';

export default function App(props: any) {
  // You can also provide a custom RPC endpoint
  const network = WalletAdapterNetwork.Mainnet; //.Devnet; //.Mainnet;
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SlopeWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    //new LedgerWalletAdapter(),
    new SolletWalletAdapter({ network }),
    new SolletExtensionWalletAdapter({ network }),
    //new CloverWalletAdapter(),
    //new MathWalletAdapter(),
    //new Coin98WalletAdapter(),
    //new SolongWalletAdapter(),
  ], [network]);

  let portfolioPositions = { "portfolio":[{"mint":"8upjSpvjcdpuzhfR1zriwg5NXkwDruejqNE9WNbPRtyA","symbol":"GRAPE","coingeckoId":"grape-2","balance":1,"price":0.053341,"value":0.053341,"tokenInfo":{"chainId":101,"address":"8upjSpvjcdpuzhfR1zriwg5NXkwDruejqNE9WNbPRtyA","symbol":"GRAPE","name":"Grape","decimals":6,"logoURI":"","extensions":{"coingeckoId":"grape-2","website":"https://grapes.network"}},"usd_24h_change":-2.61696938875755},{"mint":"So11111111111111111111111111111111111111112","balance":100,"price":141.94,"value":14194.00,"tokenInfo":{"chainId":101,"address":"So11111111111111111111111111111111111111112","symbol":"SOL","name":"SOL","decimals":9,"logoURI":"","extensions":{"coingeckoId":"solana","serumV3Usdc":"9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT","serumV3Usdt":"HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1","website":"https://solana.com/"}},"usd_24h_change":-3.1622724372417026}] }
  
    return (
      <SnackbarProvider maxSnack={3}>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletDialogProvider>
              <WalletMultiButton />
            </WalletDialogProvider>

            <p>
              <OrcaSwap swapfrom={"SOL"} swapto={"GRAPE"} portfolioPositions={portfolioPositions} />
            </p>
          </WalletProvider>
        </ConnectionProvider>
      </SnackbarProvider>
    );
}
