import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Cluster, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";

const STORAGE_AUTH_TOKEN_KEY = "@solcheck/mwa_auth_token";
const STORAGE_WALLET_ADDRESS_KEY = "@solcheck/wallet_address";

export const APP_IDENTITY = {
  name: "SolCheck",
  uri: "https://solcheck-mu.vercel.app",
  icon: "favicon.ico",
};

export function getMobileCluster(): Cluster {
  const raw = process.env.EXPO_PUBLIC_SOLANA_CLUSTER?.trim();
  if (raw === "mainnet-beta" || raw === "testnet") {
    return raw;
  }
  return "devnet";
}

export function getMobileRpcUrl(): string {
  const raw = process.env.EXPO_PUBLIC_SOLANA_RPC_URL?.trim();
  if (raw && raw.startsWith("http") && !raw.includes("<")) {
    return raw;
  }
  return "https://api.devnet.solana.com";
}

export function getMobileConnection(): Connection {
  return new Connection(getMobileRpcUrl(), "confirmed");
}

/**
 * MWA returns account.address encoded in Base64, NOT Base58.
 */
export function mwaAddressToPublicKey(base64Address: string): PublicKey {
  const bytes = Buffer.from(base64Address, "base64");
  return new PublicKey(bytes);
}

export async function getRestoredWalletAddress(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_WALLET_ADDRESS_KEY);
  } catch {
    return null;
  }
}

async function authorizeSession(
  wallet: Web3MobileWallet
): Promise<{ publicKey: PublicKey; authToken: string }> {
  const cluster = getMobileCluster();
  const chain = `solana:${cluster}` as const;
  const cachedToken = await AsyncStorage.getItem(STORAGE_AUTH_TOKEN_KEY);

  let authResult;
  if (cachedToken) {
    try {
      authResult = await wallet.authorize({
        chain,
        identity: APP_IDENTITY,
        auth_token: cachedToken,
      });
    } catch {
      authResult = await wallet.authorize({
        chain,
        identity: APP_IDENTITY,
      });
    }
  } else {
    authResult = await wallet.authorize({
      chain,
      identity: APP_IDENTITY,
    });
  }

  const firstAccount = authResult.accounts[0];
  if (!firstAccount) {
    throw new Error("No Solana account returned by wallet.");
  }

  const publicKey = mwaAddressToPublicKey(firstAccount.address);
  await AsyncStorage.multiSet([
    [STORAGE_AUTH_TOKEN_KEY, authResult.auth_token],
    [STORAGE_WALLET_ADDRESS_KEY, publicKey.toBase58()],
  ]);

  return { publicKey, authToken: authResult.auth_token };
}

export async function connectMobileWallet(): Promise<{
  publicKey: PublicKey;
  address: string;
}> {
  return transact(async (wallet: Web3MobileWallet) => {
    const { publicKey } = await authorizeSession(wallet);
    return {
      publicKey,
      address: publicKey.toBase58(),
    };
  });
}

export async function disconnectMobileWallet(): Promise<void> {
  const cachedToken = await AsyncStorage.getItem(STORAGE_AUTH_TOKEN_KEY);
  await AsyncStorage.multiRemove([
    STORAGE_AUTH_TOKEN_KEY,
    STORAGE_WALLET_ADDRESS_KEY,
  ]);

  if (cachedToken) {
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: cachedToken });
      });
    } catch {
      // Wallet may already have revoked the token
    }
  }
}

export async function signAndSendMobileTransaction(
  buildTx: (signer: PublicKey, connection: Connection) => Promise<Transaction>
): Promise<{ signature: string; signerAddress: string }> {
  const connection = getMobileConnection();

  const { signature, signerAddress } = await transact(
    async (wallet: Web3MobileWallet) => {
      const { publicKey } = await authorizeSession(wallet);
      const tx = await buildTx(publicKey, connection);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");

      tx.feePayer = publicKey;
      tx.recentBlockhash = latestBlockhash.blockhash;

      const signatures = await wallet.signAndSendTransactions({
        transactions: [tx],
      });

      const txSig = signatures[0];
      if (!txSig) {
        throw new Error("Wallet did not return a transaction signature.");
      }

      return {
        signature: txSig,
        signerAddress: publicKey.toBase58(),
      };
    }
  );

  // Best-effort confirmation on RPC so subsequent scan sees updated state immediately
  try {
    const latest = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );
  } catch {
    // Signature already broadcast by wallet; continue gracefully
  }

  return { signature, signerAddress };
}
