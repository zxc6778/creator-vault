import { useCallback, useEffect, useRef, useState } from "react";
import BackupMnemonicModal from "./components/BackupMnemonicModal";
import PrivacyBanner from "./components/PrivacyBanner";
import SecurityPanel from "./components/SecurityPanel";
import TransferPanel from "./components/TransferPanel";
import WalletSetupModal from "./components/WalletSetupModal";
import { fetchBalance, formatNativeAmount, explorerAddressUrl } from "./lib/rpc";
import {
  DEFAULT_NETWORK,
  EVM_NETWORK_IDS,
  NETWORKS,
  SOLANA_NOTE,
  getNetwork,
  type NetworkId,
} from "./lib/networks";
import {
  clearStoredKeystore,
  disconnectWallet,
  ensureTcx,
  isBackupConfirmed,
  loadStoredKeystore,
  loadStoredNetwork,
  saveStoredNetwork,
} from "./lib/tokenCore";
import type { WalletSession } from "./lib/tokenCore";
import type { AppView } from "./types";
import "./App.css";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseNetworkId(raw: string | null): NetworkId {
  if (raw && EVM_NETWORK_IDS.includes(raw as NetworkId)) {
    return raw as NetworkId;
  }
  return DEFAULT_NETWORK;
}

export default function App() {
  const [tcxLoading, setTcxLoading] = useState(true);
  const [tcxReady, setTcxReady] = useState(false);
  const [networkId, setNetworkId] = useState<NetworkId>(() =>
    parseNetworkId(loadStoredNetwork())
  );
  const network = getNetwork(networkId);

  const [session, setSession] = useState<WalletSession | null>(null);
  const passwordRef = useRef("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [view, setView] = useState<AppView>("dashboard");
  const [balance, setBalance] = useState<string>("—");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(isBackupConfirmed);

  const connected = !!session;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    ensureTcx()
      .then(() => setTcxReady(true))
      .catch(() => showToast("TokenCore WASM 加载失败"))
      .finally(() => setTcxLoading(false));
  }, [showToast]);

  const refreshBalance = useCallback(async () => {
    if (!session) return;
    setBalanceLoading(true);
    try {
      const wei = await fetchBalance(network, session.address);
      setBalance(formatNativeAmount(wei));
    } catch {
      setBalance("—");
    } finally {
      setBalanceLoading(false);
    }
  }, [session, network]);

  useEffect(() => {
    refreshBalance();
    const timer = setInterval(refreshBalance, 20_000);
    return () => clearInterval(timer);
  }, [refreshBalance]);

  useEffect(() => {
    saveStoredNetwork(networkId);
  }, [networkId]);

  useEffect(() => {
    if (!tcxReady || session) return;
    if (loadStoredKeystore()) setWalletOpen(true);
  }, [tcxReady, session]);

  const handleConnected = useCallback(
    (s: WalletSession, password: string) => {
      passwordRef.current = password;
      setSession(s);
      showToast("钱包已解锁 · 私钥仅存于本机");
      if (!isBackupConfirmed()) {
        setBackupOpen(true);
      } else {
        setBackupDone(true);
      }
    },
    [showToast]
  );

  const handleNetworkChange = (id: NetworkId) => {
    setNetworkId(id);
    showToast(`已切换至 ${NETWORKS[id].label}`);
  };

  const disconnect = () => {
    disconnectWallet();
    setSession(null);
    passwordRef.current = "";
    setBalance("—");
    showToast("已断开钱包");
  };

  const clearWallet = () => {
    if (!confirm("将删除本机 Keystore，请确认已离线备份助记词。此操作不可撤销。")) return;
    clearStoredKeystore();
    disconnect();
    setBackupDone(false);
    showToast("本地钱包数据已清除");
  };

  const navItems: { id: AppView; label: string }[] = [
    { id: "dashboard", label: "总览" },
    { id: "transfer", label: "转账" },
    { id: "security", label: "安全" },
    { id: "wallet", label: "钱包" },
  ];

  return (
    <div className="app vault-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <h1>VaultGuard</h1>
            <p>自托管安全钱包</p>
          </div>
        </div>
        <nav className="side-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <PrivacyBanner />
        <p className="tcx-foot">
          Powered by{" "}
          <a href="https://github.com/consenlabs/token-core-monorepo" target="_blank" rel="noreferrer">
            TokenCore
          </a>
        </p>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-title">
            <h2>
              {view === "dashboard" && "资产总览"}
              {view === "transfer" && "安全转账"}
              {view === "security" && "安全中心"}
              {view === "wallet" && "钱包管理"}
            </h2>
            {tcxReady && <span className="badge badge-ok">TokenCore 已就绪</span>}
            {!tcxReady && !tcxLoading && (
              <span className="badge badge-warn">WASM 未加载</span>
            )}
          </div>
          <select
            className="network-select"
            value={networkId}
            onChange={(e) => handleNetworkChange(e.target.value as NetworkId)}
            aria-label="选择网络"
          >
            {Object.values(NETWORKS).map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </header>

        <main className="main">
          {!backupDone && connected && (
            <div className="alert-banner" role="alert">
              <strong>请尽快离线备份助记词</strong>
              <button type="button" className="btn-outline btn-sm" onClick={() => setBackupOpen(true)}>
                立即备份
              </button>
            </div>
          )}

          {view === "dashboard" && (
            <>
              <section className="card balance-card">
                <p className="label">账户余额 · {network.shortLabel}</p>
                {connected && session ? (
                  <>
                    <a
                      className="address"
                      href={explorerAddressUrl(network, session.address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddress(session.address)}
                    </a>
                    <p className="balance">
                      {balanceLoading ? "查询中…" : balance}{" "}
                      <span>{network.nativeSymbol}</span>
                    </p>
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={refreshBalance}
                      disabled={balanceLoading}
                    >
                      刷新余额
                    </button>
                  </>
                ) : (
                  <>
                    <p className="balance muted">未连接钱包</p>
                    <button
                      type="button"
                      className="btn-primary btn-block btn-lg"
                      onClick={() => setWalletOpen(true)}
                      disabled={tcxLoading}
                    >
                      {tcxLoading ? "加载 TokenCore…" : "创建 / 导入钱包"}
                    </button>
                  </>
                )}
              </section>

              <section className="card chains-card">
                <h3>多链支持</h3>
                <div className="chain-grid">
                  {(["eth", "bsc", "base"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`chain-chip ${networkId === id ? "active" : ""}`}
                      style={{ borderColor: NETWORKS[id].color }}
                      onClick={() => handleNetworkChange(id)}
                    >
                      {NETWORKS[id].shortLabel}
                    </button>
                  ))}
                  <span className="chain-chip disabled" title={SOLANA_NOTE}>
                    SOL（暂不支持签名）
                  </span>
                </div>
                <p className="desc">{SOLANA_NOTE}</p>
              </section>

              <section className="card security-card">
                <h3>自托管承诺</h3>
                <ul>
                  <li>助记词与私钥经 TokenCore 本地加密，全程不离开设备</li>
                  <li>无注册、无 KYC、不上传任何个人或链上行为数据</li>
                  <li>转账前进行合约地址与首次收款风险提示</li>
                </ul>
              </section>
            </>
          )}

          {view === "transfer" && (
            <>
              {connected && session ? (
                <TransferPanel
                  session={session}
                  network={network}
                  onSuccess={() => {
                    showToast("转账已广播");
                    refreshBalance();
                  }}
                />
              ) : (
                <section className="card">
                  <h3>安全转账</h3>
                  <p className="desc">请先创建或解锁钱包，再进行链上转账。</p>
                  <button
                    type="button"
                    className="btn-primary btn-block btn-lg"
                    onClick={() => setWalletOpen(true)}
                  >
                    连接钱包
                  </button>
                </section>
              )}
            </>
          )}

          {view === "security" && (
            <SecurityPanel
              tcxReady={tcxReady}
              backupDone={backupDone}
              onRequestBackup={() => setBackupOpen(true)}
            />
          )}

          {view === "wallet" && (
            <section className="card wallet-settings">
              <h3>钱包管理</h3>
              {connected && session ? (
                <>
                  <p className="full-address mono">{session.address}</p>
                  <p className="desc">派生路径：{session.derivationPath}</p>
                  <button
                    type="button"
                    className="btn-outline btn-block"
                    onClick={() => setBackupOpen(true)}
                  >
                    离线备份助记词
                  </button>
                  <button type="button" className="btn-secondary btn-block" onClick={disconnect}>
                    断开连接
                  </button>
                  <button type="button" className="btn-danger btn-block" onClick={clearWallet}>
                    清除本机钱包
                  </button>
                </>
              ) : (
                <>
                  <p className="desc">尚未连接钱包</p>
                  <button
                    type="button"
                    className="btn-primary btn-block btn-lg"
                    onClick={() => setWalletOpen(true)}
                  >
                    创建 / 导入钱包
                  </button>
                </>
              )}
            </section>
          )}
        </main>

        <nav className="bottom-nav" aria-label="移动端导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <WalletSetupModal
        open={walletOpen}
        loading={tcxLoading}
        network={network}
        onClose={() => setWalletOpen(false)}
        onConnected={handleConnected}
      />

      {session && passwordRef.current && (
        <BackupMnemonicModal
          open={backupOpen}
          session={session}
          password={passwordRef.current}
          onDone={() => {
            setBackupOpen(false);
            setBackupDone(true);
            showToast("助记词备份已完成");
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
