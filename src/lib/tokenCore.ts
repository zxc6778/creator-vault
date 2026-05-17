import {
  broadcastRawTx,
  fetchGasPrice,
  fetchNonce,
  parseNativeAmount,
} from "./rpc";
import type { NetworkConfig } from "./networks";
import {
  ETH_PATH,
  cache_keystore,
  clear_cached_keystore,
  create_keystore,
  derive_accounts,
  export_mnemonic,
  initTcxWasm,
  sign_tx,
} from "./tcxWasm";

const STORAGE_KEY = "vaultguard-keystore";
const NETWORK_KEY = "vaultguard-network";
const BACKUP_KEY = "vaultguard-backup-done";
const PIN_KEY = "vaultguard-transfer-pin";

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

export interface SignTxResult {
  signature?: string;
  signedTransaction?: string;
  rawTransaction?: string;
  txHash?: string;
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
  localStorage.removeItem(BACKUP_KEY);
  clear_cached_keystore();
}

export function isBackupConfirmed(): boolean {
  return localStorage.getItem(BACKUP_KEY) === "1";
}

export function markBackupConfirmed(): void {
  localStorage.setItem(BACKUP_KEY, "1");
}

export function loadStoredNetwork(): string | null {
  try {
    return localStorage.getItem(NETWORK_KEY);
  } catch {
    return null;
  }
}

export function saveStoredNetwork(id: string): void {
  localStorage.setItem(NETWORK_KEY, id);
}

export function hasTransferPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function setTransferPin(pin: string): void {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("转账 PIN 须为 6 位数字");
  }
  localStorage.setItem(PIN_KEY, pin);
}

export function verifyTransferPin(pin: string): boolean {
  return localStorage.getItem(PIN_KEY) === pin;
}

export function clearTransferPin(): void {
  localStorage.removeItem(PIN_KEY);
}

export async function generateMnemonicPhrase(): Promise<string> {
  await ensureTcx();
  const tempPass = crypto.randomUUID();
  const entropy = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const keystoreJson = create_keystore(
    JSON.stringify({ password: tempPass, entropy, network: "MAINNET" })
  );
  const { mnemonic } = JSON.parse(
    export_mnemonic(JSON.stringify({ keystoreJson, key: tempPass }))
  ) as { mnemonic: string };
  clear_cached_keystore();
  if (!mnemonic) throw new Error("助记词生成失败");
  return mnemonic;
}

export async function exportWalletMnemonic(
  session: WalletSession,
  password: string
): Promise<string> {
  await ensureTcx();
  const { mnemonic } = JSON.parse(
    export_mnemonic(
      JSON.stringify({ keystoreJson: session.keystoreJson, key: password })
    )
  ) as { mnemonic: string };
  if (!mnemonic) throw new Error("无法导出助记词，请检查密码");
  return mnemonic;
}

export async function createPasswordWallet(
  password: string,
  mnemonic?: string,
  network: NetworkConfig
): Promise<WalletSession> {
  await ensureTcx();
  const param: Record<string, string> = {
    password,
    network: network.tcxNetwork,
  };
  if (mnemonic?.trim()) param.mnemonic = mnemonic.trim();
  const keystoreJson = create_keystore(JSON.stringify(param));
  return unlockKeystore(keystoreJson, password, network, true);
}

export async function unlockKeystore(
  keystoreJson: string,
  password: string,
  network: NetworkConfig,
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
            chain: network.tcxChain,
            derivationPath: ETH_PATH,
            chainId: network.chainId,
            network: network.tcxNetwork,
          },
        ],
      })
    )
  ) as EthAccount[];

  const eth = accounts[0];
  if (!eth?.address) {
    throw new Error("无法派生地址，请检查密码或助记词");
  }

  if (persist) saveKeystore(keystoreJson);

  return {
    address: eth.address,
    keystoreJson,
    derivationPath: eth.derivationPath || ETH_PATH,
  };
}

export function disconnectWallet(): void {
  clear_cached_keystore();
}

export async function signNativeTransfer(
  session: WalletSession,
  password: string,
  network: NetworkConfig,
  to: string,
  amount: string
): Promise<SignTxResult> {
  await ensureTcx();
  cache_keystore(session.keystoreJson);

  const toAddr = to.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddr)) {
    throw new Error("收款地址格式不正确");
  }

  const valueWei = parseNativeAmount(amount);
  const nonce = await fetchNonce(network, session.address);
  const gasPrice = await fetchGasPrice(network);
  const gasLimit = "21000";

  const result = JSON.parse(
    sign_tx(
      JSON.stringify({
        key: password,
        chain: network.tcxChain,
        derivationPath: session.derivationPath,
        input: {
          nonce,
          gasPrice,
          gasLimit,
          to: toAddr,
          value: valueWei.toString(),
          chainId: network.chainId,
        },
      })
    )
  ) as SignTxResult;

  if (!result.signature && !result.signedTransaction && !result.rawTransaction) {
    throw new Error("TokenCore 签名失败");
  }
  return result;
}

export async function signAndBroadcastTransfer(
  session: WalletSession,
  password: string,
  network: NetworkConfig,
  to: string,
  amount: string
): Promise<string> {
  const signed = await signNativeTransfer(session, password, network, to, amount);
  const raw = extractRawTransaction(signed);
  return broadcastRawTx(network, raw);
}

export function extractRawTransaction(result: SignTxResult): string {
  const raw =
    result.signedTransaction || result.rawTransaction || result.signature || "";
  if (!raw) throw new Error("未获取到已签名交易数据");
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}
