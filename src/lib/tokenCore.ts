import {
  ETH_PATH,
  cache_keystore,
  clear_cached_keystore,
  create_keystore,
  derive_accounts,
  initTcxWasm,
  sign_message,
} from "./tcxWasm";

const STORAGE_KEY = "creator-vault-keystore";

export interface EthAccount {
  address: string;
  chain: string;
  derivationPath: string;
  publicKey: string;
}

export interface WalletSession {
  address: string;
  keystoreJson: string;
  derivationPath: string;
}

export interface MintSignResult {
  signature: string;
  payload: string;
}

export async function ensureTcx(): Promise<void> {
  await initTcxWasm();
}

export function loadStoredKeystore(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveKeystore(keystoreJson: string): void {
  localStorage.setItem(STORAGE_KEY, keystoreJson);
}

export function clearStoredKeystore(): void {
  localStorage.removeItem(STORAGE_KEY);
  clear_cached_keystore();
}

export async function createPasswordWallet(
  password: string,
  mnemonic?: string
): Promise<WalletSession> {
  await ensureTcx();
  const param: Record<string, string> = {
    password,
    network: "MAINNET",
  };
  if (mnemonic?.trim()) {
    param.mnemonic = mnemonic.trim();
  }
  const keystoreJson = create_keystore(JSON.stringify(param));
  return unlockKeystore(keystoreJson, password, true);
}

export async function unlockKeystore(
  keystoreJson: string,
  password: string,
  persist = true
): Promise<WalletSession> {
  await ensureTcx();
  cache_keystore(keystoreJson);
  const accounts = JSON.parse(
    derive_accounts(
      JSON.stringify({
        key: password,
        derivations: [
          {
            chain: "ETHEREUM",
            derivationPath: ETH_PATH,
            chainId: "1",
            network: "MAINNET",
          },
        ],
      })
    )
  ) as EthAccount[];

  const eth = accounts[0];
  if (!eth?.address) {
    throw new Error("无法派生以太坊地址，请检查密码或助记词");
  }

  if (persist) {
    saveKeystore(keystoreJson);
  }

  return {
    address: eth.address,
    keystoreJson,
    derivationPath: eth.derivationPath || ETH_PATH,
  };
}

export function disconnectWallet(): void {
  clear_cached_keystore();
}

export async function signMintAttestation(
  session: WalletSession,
  password: string,
  title: string,
  supply: number,
  royalty: number
): Promise<MintSignResult> {
  await ensureTcx();
  cache_keystore(session.keystoreJson);
  const payload = JSON.stringify({
    action: "creator-vault-mint",
    title,
    supply,
    royaltyRate: royalty,
    address: session.address,
    ts: Date.now(),
  });

  const result = JSON.parse(
    sign_message(
      JSON.stringify({
        key: password,
        chain: "ETHEREUM",
        derivationPath: session.derivationPath,
        input: {
          message: payload,
          signatureType: "PersonalSign",
        },
      })
    )
  ) as { signature: string };

  if (!result.signature) {
    throw new Error("TokenCore 签名失败");
  }

  return { signature: result.signature, payload };
}

export async function signTipIdentity(
  session: WalletSession,
  password: string
): Promise<string> {
  await ensureTcx();
  cache_keystore(session.keystoreJson);
  const result = JSON.parse(
    sign_message(
      JSON.stringify({
        key: password,
        chain: "ETHEREUM",
        derivationPath: session.derivationPath,
        input: {
          message: `creator-vault-tip:${session.address}`,
          signatureType: "PersonalSign",
        },
      })
    )
  ) as { signature: string };
  return result.signature;
}

export { tipLinkForAddress as buildTipLink } from "./assets";
