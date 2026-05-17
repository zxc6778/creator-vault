import type { NetworkConfig } from "./networks";

async function rpcCall<T>(network: NetworkConfig, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(network.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) {
    throw new Error(json.error.message || "RPC 请求失败");
  }
  if (json.result === undefined) {
    throw new Error("RPC 无返回数据");
  }
  return json.result;
}

export function parseEthToWei(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error("请输入有效的转账金额");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const padded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded || "0");
}

export function formatWeiToEth(wei: bigint): string {
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = wei % base;
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export async function fetchBalance(network: NetworkConfig, address: string): Promise<bigint> {
  const hex = await rpcCall<string>(network, "eth_getBalance", [address, "latest"]);
  return BigInt(hex);
}

export async function fetchNonce(network: NetworkConfig, address: string): Promise<string> {
  const hex = await rpcCall<string>(network, "eth_getTransactionCount", [address, "pending"]);
  return BigInt(hex).toString();
}

export async function fetchGasPrice(network: NetworkConfig): Promise<string> {
  const hex = await rpcCall<string>(network, "eth_gasPrice", []);
  return BigInt(hex).toString();
}

export async function broadcastRawTx(network: NetworkConfig, rawTx: string): Promise<string> {
  const tx = rawTx.startsWith("0x") ? rawTx : `0x${rawTx}`;
  return rpcCall<string>(network, "eth_sendRawTransaction", [tx]);
}

export function explorerTxUrl(network: NetworkConfig, hash: string): string {
  return `${network.explorer}/tx/${hash}`;
}
