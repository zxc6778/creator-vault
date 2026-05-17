export type AppView = "home" | "swap" | "wallet" | "guide";

export interface TutorialStep {
  id: number;
  title: string;
  desc: string;
  tip: string;
}
