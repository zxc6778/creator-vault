import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActionModal from "./components/ActionModal";
import WalletModal from "./components/WalletModal";
import { FUND_LABELS, INITIAL_FLOWS, INITIAL_WORKS } from "./data";
import { COVERS, TIP_PREVIEW } from "./lib/assets";
import {
  buildTipLink,
  disconnectWallet,
  ensureTcx,
  signMintAttestation,
  signTipIdentity,
} from "./lib/tokenCore";
import type { WalletSession } from "./lib/tokenCore";
import type { Action, FundFlow, Tab, Work } from "./types";
import "./App.css";

const PLACEHOLDER_COVERS = [COVERS.c1, COVERS.c2, COVERS.c3, COVERS.c4];

const T = {
  tagline: "\u4f5c\u54c1\u4e0e\u8d44\u91d1\uff0c\u4ec5\u6b64\u800c\u5df2",
  withdraw: "\u53ef\u63d0\u73b0",
  connect: "\u8fde\u63a5\u521b\u4f5c\u8005\u94b1\u5305",
  mint: "\u94f8\u9020 NFT",
  royalty: "\u67e5\u770b\u7248\u7a0e",
  tip: "\u7c89\u4e1d\u6253\u8d4f",
  myWorks: "\u6211\u7684\u4f5c\u54c1",
  funds: "\u8d44\u91d1\u6d41\u6c34",
  holders: "\u4f4d\u6301\u6709\u8005",
  royaltyPct: "\u7248\u7a0e",
  earned: "\u7d2f\u8ba1\u6536\u76ca",
  tipSum: "\u6253\u8d4f",
  royaltySum: "\u7248\u7a0e",
  saleSum: "\u552e\u51fa",
  emptyWorks: "\u8fd8\u6ca1\u6709\u4f5c\u54c1\uff0c\u70b9\u51fb\u300c\u94f8\u9020 NFT\u300d\u5f00\u59cb\u521b\u4f5c",
  emptyFunds: "\u6682\u65e0\u8d44\u91d1\u8bb0\u5f55",
  disconnected: "\u5df2\u65ad\u5f00\u8fde\u63a5",
  connected: "TokenCore \u94b1\u5305\u5df2\u8fde\u63a5",
  mintOk: (t: string) => `\u300c${t}\u300d\u5df2\u901a\u8fc7 TokenCore \u7b7e\u540d`,
  mintNeedWallet: "\u8bf7\u5148\u8fde\u63a5\u94b1\u5305\u518d\u94f8\u9020",
  tipCopied: "\u6253\u8d4f\u94fe\u63a5\u5df2\u590d\u5236",
  tipNeedWallet: "\u8bf7\u5148\u8fde\u63a5\u94b1\u5305",
  quickActions: "\u5feb\u6377\u64cd\u4f5c",
  worksList: "\u4f5c\u54c1\u5217\u8868",
  fundsList: "\u8d44\u91d1\u6d41\u6c34",
  tcxLoading: "TokenCore \u52a0\u8f7d\u4e2d\u2026",
  tcxReady: "TokenCore",
  signed: "\u5df2\u7b7e\u540d",
  wasmFail: "TokenCore WASM \u52a0\u8f7d\u5931\u8d25",
  mintSignFail: "\u94f8\u9020\u7b7e\u540d\u5931\u8d25",
} as const;

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export default function App() {
  const [tcxLoading, setTcxLoading] = useState(true);
  const [tcxReady, setTcxReady] = useState(false);
  const [session, setSession] = useState<WalletSession | null>(null);
  const passwordRef = useRef<string>("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("works");
  const [modal, setModal] = useState<Action | null>(null);
  const [works, setWorks] = useState<Work[]>(INITIAL_WORKS);
  const [flows] = useState<FundFlow[]>(INITIAL_FLOWS);
  const [toast, setToast] = useState<string | null>(null);
  const [tipLink, setTipLink] = useState(TIP_PREVIEW);
  const [mintBusy, setMintBusy] = useState(false);

  const connected = !!session;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    ensureTcx()
      .then(() => setTcxReady(true))
      .catch((err) => {
        console.error("TokenCore init failed:", err);
        setToast(T.wasmFail);
      })
      .finally(() => setTcxLoading(false));
  }, [showToast]);

  const balance = useMemo(
    () => flows.reduce((s, f) => s + f.amount, 0) + works.reduce((s, w) => s + w.earned, 0) * 0.1,
    [flows, works]
  );

  const fundSummary = useMemo(() => {
    const sum = { tip: 0, royalty: 0, sale: 0 };
    for (const f of flows) sum[f.type] += f.amount;
    return sum;
  }, [flows]);

  const handleWalletConnected = useCallback(
    async (s: WalletSession, password: string) => {
      passwordRef.current = password;
      setSession(s);
      showToast(T.connected);
      try {
        const sig = await signTipIdentity(s, password);
        setTipLink(buildTipLink(s.address, sig));
      } catch {
        setTipLink(buildTipLink(s.address));
      }
    },
    [showToast]
  );

  const connectWallet = () => {
    if (connected) {
      disconnectWallet();
      setSession(null);
      passwordRef.current = "";
      setTipLink(TIP_PREVIEW);
      showToast(T.disconnected);
      return;
    }
    if (!tcxReady) {
      showToast(T.tcxLoading);
      return;
    }
    setWalletOpen(true);
  };

  const openAction = (action: Action) => {
    if ((action === "mint" || action === "tip") && !connected) {
      showToast(action === "mint" ? T.mintNeedWallet : T.tipNeedWallet);
      setWalletOpen(true);
      return;
    }
    setModal(action);
  };

  const handleMint = async (title: string, supply: number, royalty: number) => {
    if (!session || !passwordRef.current) {
      showToast(T.mintNeedWallet);
      setWalletOpen(true);
      return;
    }
    setMintBusy(true);
    try {
      const { signature } = await signMintAttestation(
        session,
        passwordRef.current,
        title,
        supply,
        royalty
      );
      const cover = PLACEHOLDER_COVERS[works.length % PLACEHOLDER_COVERS.length];
      const work: Work = {
        id: `w${Date.now()}`,
        title,
        cover,
        edition: `0 / ${supply}`,
        holders: 0,
        earned: 0,
        royaltyRate: royalty,
        mintSignature: signature,
      };
      setWorks((prev) => [work, ...prev]);
      showToast(T.mintOk(title));
    } catch (e) {
      showToast(e instanceof Error ? e.message : T.mintSignFail);
    } finally {
      setMintBusy(false);
    }
  };

  const handleCopyTip = () => {
    showToast(T.tipCopied);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>Creator Vault</h1>
          <p>{T.tagline}</p>
          {tcxReady && <span className="tcx-badge">{T.tcxReady}</span>}
        </div>
        <div className="balance-pill">
          <span>{T.withdraw}</span>
          <strong>{balance.toFixed(2)} ETH</strong>
        </div>
      </header>

      <button
        type="button"
        className={`wallet-btn ${connected ? "connected" : ""}`}
        onClick={connectWallet}
        disabled={tcxLoading}
      >
        {tcxLoading
          ? T.tcxLoading
          : connected && session
            ? shortAddress(session.address)
            : T.connect}
      </button>

      <section className="actions" aria-label={T.quickActions}>
        <button type="button" className="action-card" onClick={() => openAction("mint")}>
          <div className="icon" aria-hidden>{"\u2726"}</div>
          <span>{T.mint}</span>
        </button>
        <button type="button" className="action-card" onClick={() => openAction("royalty")}>
          <div className="icon" aria-hidden>{"\u25c8"}</div>
          <span>{T.royalty}</span>
        </button>
        <button type="button" className="action-card" onClick={() => openAction("tip")}>
          <div className="icon" aria-hidden>{"\u2661"}</div>
          <span>{T.tip}</span>
        </button>
      </section>

      <nav className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "works"}
          className={`tab ${tab === "works" ? "active" : ""}`}
          onClick={() => setTab("works")}
        >
          {T.myWorks}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "funds"}
          className={`tab ${tab === "funds" ? "active" : ""}`}
          onClick={() => setTab("funds")}
        >
          {T.funds}
        </button>
      </nav>

      <main>
        {tab === "works" && (
          <section className="works-list" aria-label={T.worksList}>
            {works.length === 0 ? (
              <p className="empty-hint">{T.emptyWorks}</p>
            ) : (
              works.map((w) => (
                <article key={w.id} className="work-card">
                  <img className="work-cover" src={w.cover} alt={w.title} loading="lazy" />
                  <div className="work-info">
                    <h3>{w.title}</h3>
                    <div className="work-meta">
                      <span>{w.edition}</span>
                      <span>
                        {w.holders} {T.holders}
                      </span>
                      <span>
                        {T.royaltyPct} {w.royaltyRate}%
                      </span>
                      {w.mintSignature && <span className="signed-badge">{T.signed}</span>}
                    </div>
                    <div className="work-stats">
                      <div className="work-stat">
                        <label>{T.earned}</label>
                        <strong>{w.earned.toFixed(2)} ETH</strong>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {tab === "funds" && (
          <section aria-label={T.fundsList}>
            <div className="funds-summary">
              <div className="summary-item tip">
                <label>{T.tipSum}</label>
                <strong>{fundSummary.tip.toFixed(2)}</strong>
              </div>
              <div className="summary-item royalty">
                <label>{T.royaltySum}</label>
                <strong>{fundSummary.royalty.toFixed(2)}</strong>
              </div>
              <div className="summary-item sale">
                <label>{T.saleSum}</label>
                <strong>{fundSummary.sale.toFixed(2)}</strong>
              </div>
            </div>
            <div className="funds-list">
              {flows.length === 0 ? (
                <p className="empty-hint">{T.emptyFunds}</p>
              ) : (
                flows.map((f) => (
                  <div key={f.id} className="fund-row">
                    <div className={`fund-badge ${f.type}`}>{FUND_LABELS[f.type]}</div>
                    <div className="fund-detail">
                      <div className="title">
                        {f.from}
                        {f.workTitle ? ` ? ${f.workTitle}` : ""}
                      </div>
                      <div className="sub">{FUND_LABELS[f.type]}</div>
                    </div>
                    <div className="fund-amount">
                      <strong>
                        +{f.amount} {f.currency}
                      </strong>
                      <time>{f.at}</time>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      <ActionModal
        action={modal}
        works={works}
        tipLink={tipLink}
        mintBusy={mintBusy}
        walletAddress={session?.address}
        onClose={() => setModal(null)}
        onMint={handleMint}
        onCopyTip={handleCopyTip}
      />

      <WalletModal
        open={walletOpen}
        loading={tcxLoading}
        onClose={() => setWalletOpen(false)}
        onConnected={handleWalletConnected}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
