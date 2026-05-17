import { fetchBytecode } from "./rpc";
import type { NetworkConfig } from "./networks";

export type RiskLevel = "low" | "medium" | "high";

export interface TransferRiskReport {
  level: RiskLevel;
  messages: string[];
  isContract: boolean;
  isNewRecipient: boolean;
}

const RECIPIENTS_KEY = "vaultguard-known-recipients";

function loadKnownRecipients(): Set<string> {
  try {
    const raw = localStorage.getItem(RECIPIENTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markRecipientKnown(address: string): void {
  const set = loadKnownRecipients();
  set.add(address.toLowerCase());
  localStorage.setItem(RECIPIENTS_KEY, JSON.stringify([...set]));
}

export async function analyzeTransferRisk(
  network: NetworkConfig,
  from: string,
  to: string
): Promise<TransferRiskReport> {
  const messages: string[] = [];
  let level: RiskLevel = "low";
  const toNorm = to.trim().toLowerCase();
  const fromNorm = from.trim().toLowerCase();

  if (toNorm === fromNorm) {
    messages.push("收款地址与发送地址相同");
    level = "high";
  }

  if (!/^0x[a-f0-9]{40}$/.test(toNorm)) {
    messages.push("地址格式无效");
    return { level: "high", messages, isContract: false, isNewRecipient: true };
  }

  let isContract = false;
  try {
    const code = await fetchBytecode(network, toNorm);
    isContract = code !== "0x" && code !== "0x0";
    if (isContract) {
      messages.push("目标为合约地址，可能与个人钱包不同，请确认交互意图");
      level = level === "high" ? "high" : "medium";
    }
  } catch {
    messages.push("无法检测目标地址类型，请自行核实");
    level = "medium";
  }

  const known = loadKnownRecipients();
  const isNewRecipient = !known.has(toNorm);
  if (isNewRecipient) {
    messages.push("首次向该地址转账，请仔细核对每一位字符");
    if (level === "low") level = "medium";
  } else {
    messages.push("该地址曾在本设备成功转账");
  }

  if (messages.length === 0) {
    messages.push("基础检查通过，仍请确认金额与网络");
  }

  return { level, messages, isContract, isNewRecipient };
}

export function riskLabel(level: RiskLevel): string {
  if (level === "high") return "高风险";
  if (level === "medium") return "注意";
  return "风险较低";
}
