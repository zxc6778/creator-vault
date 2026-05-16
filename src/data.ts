import type { FundFlow, Work } from "./types";
import { COVERS } from "./lib/assets";

export const INITIAL_WORKS: Work[] = [
  {
    id: "w1",
    title: "霓虹雨巷",
    cover: COVERS.c1,
    edition: "1 / 50",
    holders: 12,
    earned: 2.4,
    royaltyRate: 8,
  },
  {
    id: "w2",
    title: "静物 · 晨光",
    cover: COVERS.c2,
    edition: "3 / 20",
    holders: 8,
    earned: 1.85,
    royaltyRate: 10,
  },
  {
    id: "w3",
    title: "声波档案 #07",
    cover: COVERS.c3,
    edition: "1 / 1",
    holders: 1,
    earned: 5.2,
    royaltyRate: 5,
  },
];

export const INITIAL_FLOWS: FundFlow[] = [
  {
    id: "f1",
    type: "tip",
    amount: 0.15,
    currency: "ETH",
    from: "fan_aurora",
    workTitle: "霓虹雨巷",
    at: "今天 14:32",
  },
  {
    id: "f2",
    type: "royalty",
    amount: 0.08,
    currency: "ETH",
    from: "二次流转",
    workTitle: "静物 · 晨光",
    at: "今天 11:05",
  },
  {
    id: "f3",
    type: "sale",
    amount: 0.6,
    currency: "ETH",
    from: "collector_m",
    workTitle: "声波档案 #07",
    at: "昨天 20:18",
  },
  {
    id: "f4",
    type: "tip",
    amount: 0.05,
    currency: "ETH",
    from: "匿名粉丝",
    at: "昨天 09:44",
  },
  {
    id: "f5",
    type: "royalty",
    amount: 0.12,
    currency: "ETH",
    from: "二次流转",
    workTitle: "霓虹雨巷",
    at: "3月12日",
  },
];

export const FUND_LABELS: Record<string, string> = {
  tip: "打赏",
  royalty: "版税",
  sale: "售出",
};
