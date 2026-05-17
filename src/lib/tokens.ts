import type { NetworkId } from "./networks";

export interface SwapToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Paraswap / ERC20 地址，ETH 为特殊占位 */
  address: string;
}

const ETH_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const MAINNET_TOKENS: SwapToken[] = [
  { id: "eth", symbol: "ETH", name: "以太坊", decimals: 18, address: ETH_PLACEHOLDER },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "泰达币",
    decimals: 6,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
];

export function getSwapTokens(networkId: NetworkId): SwapToken[] {
  return networkId === "mainnet" ? MAINNET_TOKENS : [];
}

export function getTokenById(networkId: NetworkId, id: string): SwapToken | undefined {
  return getSwapTokens(networkId).find((t) => t.id === id);
}

export function paraswapNetworkId(networkId: NetworkId): number {
  return networkId === "mainnet" ? 1 : 11155111;
}
