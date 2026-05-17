export type NetworkId = "eth" | "bsc" | "base" | "sepolia";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  shortLabel: string;
  chainId: string;
  tcxNetwork: "MAINNET" | "TESTNET";
  rpcUrl: string;
  explorer: string;
  nativeSymbol: string;
  /** TokenCore 链标识（EVM 系均用 ETHEREUM 签名） */
  tcxChain: "ETHEREUM";
  color: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  eth: {
    id: "eth",
    label: "Ethereum 主网",
    shortLabel: "ETH",
    chainId: "1",
    tcxNetwork: "MAINNET",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
    tcxChain: "ETHEREUM",
    color: "#627eea",
  },
  bsc: {
    id: "bsc",
    label: "BNB Smart Chain",
    shortLabel: "BSC",
    chainId: "56",
    tcxNetwork: "MAINNET",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
    tcxChain: "ETHEREUM",
    color: "#f0b90b",
  },
  base: {
    id: "base",
    label: "Base 主网",
    shortLabel: "Base",
    chainId: "8453",
    tcxNetwork: "MAINNET",
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    nativeSymbol: "ETH",
    tcxChain: "ETHEREUM",
    color: "#0052ff",
  },
  sepolia: {
    id: "sepolia",
    label: "Sepolia 测试网",
    shortLabel: "测试",
    chainId: "11155111",
    tcxNetwork: "TESTNET",
    rpcUrl: "https://rpc.sepolia.org",
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    tcxChain: "ETHEREUM",
    color: "#8b9dc3",
  },
};

/** Solana 需 TokenCore 单独链接支持，当前 tcx-wasm 未包含 */
export const SOLANA_NOTE =
  "Solana（SOL）需专用签名模块。当前版本基于 TokenCore 支持 EVM 链（ETH / BSC / Base）。";

export const DEFAULT_NETWORK: NetworkId = "sepolia";

export function getNetwork(id: NetworkId): NetworkConfig {
  return NETWORKS[id];
}

export const EVM_NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[];
