export type NetworkId = "mainnet" | "sepolia";

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  shortLabel: string;
  chainId: string;
  tcxNetwork: "MAINNET" | "TESTNET";
  rpcUrl: string;
  explorer: string;
  nativeSymbol: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: "mainnet",
    label: "以太坊主网",
    shortLabel: "主网",
    chainId: "1",
    tcxNetwork: "MAINNET",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
  },
  sepolia: {
    id: "sepolia",
    label: "Sepolia 测试网",
    shortLabel: "测试网",
    chainId: "11155111",
    tcxNetwork: "TESTNET",
    rpcUrl: "https://rpc.sepolia.org",
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
  },
};

export const DEFAULT_NETWORK: NetworkId = "sepolia";

export function getNetwork(id: NetworkId): NetworkConfig {
  return NETWORKS[id];
}
