import { useCallback, useEffect, useRef, useState } from "react";
import BackupMnemonicModal from "./components/BackupMnemonicModal";
import OnboardingGuide from "./components/OnboardingGuide";
import SendPanel from "./components/SendPanel";
import SwapPanel from "./components/SwapPanel";
import WalletSetupModal from "./components/WalletSetupModal";
import { fetchBalance, formatWeiToEth } from "./lib/ethereum";
import {
  DEFAULT_NETWORK,
  NETWORKS,
  getNetwork,
  type NetworkId,
} from "./lib/networks";
import {
  clearStoredKeystore,
  disconnectWallet,
  ensureTcx,
  isBackupConfirmed,
  isTutorialDone,
  loadStoredKeystore,
  loadStoredNetwork,
  markTutorialDone,
  saveStoredNetwork,
} from "./lib/tokenCore";
import type { WalletSession } from "./lib/tokenCore";
import type { AppView } from "./types";
import "./App.css";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function App() {
  const [tcxLoading, setTcxLoading] = useState(true);
  const [tcxReady, setTcxReady] = useState(false);
  const [networkId, setNetworkId] = useState<NetworkId>(() => {
    const stored = loadStoredNetwork();
    return stored === "mainnet" || stored === "sepolia" ? stored : DEFAULT_NETWORK;
  });
  const network = getNetwork(networkId);

  const [session, setSession] = useState<WalletSession | null>(null);
  const passwordRef = useRef("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [view, setView] = useState<AppView>("home");
  const [balance, setBalance] = useState<string>("—");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(isBackupConfirmed);
  const [transferDone, setTransferDone] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(isTutorialDone);
  const [guideStep, setGuideStep] = useState(1);

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
      setBalance(formatWeiToEth(wei));
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
    const ks = loadStoredKeystore();
    if (ks) setWalletOpen(true);
  }, [tcxReady, session]);

  const handleConnected = useCallback(
    (s: WalletSession, password: string) => {
      passwordRef.current = password;
      setSession(s);
      setGuideStep(2);
      showToast("钱包已解锁");
      if (!isBackupConfirmed()) {
        setBackupOpen(true);
      } else {
        setBackupDone(true);
        setGuideStep(3);
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
    if (!confirm("将删除本机 Keystore，请确认已备份助记词。此操作不可撤销。")) return;
    clearStoredKeystore();
    disconnect();
    setBackupDone(false);
    setTransferDone(false);
    setTutorialDone(false);
    showToast("本地钱包数据已清除");
  };

  const onGuideAction = (step: number) => {
    setGuideStep(step);
    if (step === 1) setWalletOpen(true);
    else if (step === 2) setBackupOpen(true);
    else if (step === 3) setView("home");
    else if (step === 4) setView("swap");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Easy Wallet</h1>
          <p>小白友好 · TokenCore 链上助手</p>
          {tcxReady && <span className="badge">TokenCore</span>}
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

      <nav className="bottom-nav" aria-label="主导航">
        <button
          type="button"
          className={view === "home" ? "active" : ""}
          onClick={() => setView("home")}
        >
          首页
        </button>
        <button
          type="button"
          className={view === "swap" ? "active" : ""}
          onClick={() => setView("swap")}
        >
          闪兑
        </button>
        <button
          type="button"
          className={view === "guide" ? "active" : ""}
          onClick={() => setView("guide")}
        >
          教程
        </button>
        <button
          type="button"
          className={view === "wallet" ? "active" : ""}
          onClick={() => setView("wallet")}
        >
          钱包
        </button>
      </nav>

      <main className="main">
        {view === "home" && (
          <>
            <section className="card balance-card">
              <p className="label">账户余额 · {network.shortLabel}</p>
              {connected && session ? (
                <>
                  <p className="address">{shortAddress(session.address)}</p>
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

            {connected && session && passwordRef.current && (
              <SendPanel
                session={session}
                password={passwordRef.current}
                network={network}
                onSuccess={() => {
                  setTransferDone(true);
                  setGuideStep(3);
                  showToast("转账已广播");
                  refreshBalance();
                }}
              />
            )}

            <section className="card security-card">
              <h3>安全说明</h3>
              <ul>
                <li>助记词与 Keystore 经 TokenCore 本地加密，不上传任何服务器</li>
                <li>密码仅用于解锁本机存储，遗忘后需用助记词恢复</li>
                <li>闪兑仅在以太坊主网可用，测试网请用转账练习</li>
              </ul>
            </section>
          </>
        )}

        {view === "swap" && (
          <>
            {connected && session && passwordRef.current ? (
              <SwapPanel
                session={session}
                password={passwordRef.current}
                network={network}
                onSuccess={() => {
                  showToast("闪兑交易已提交");
                  refreshBalance();
                }}
              />
            ) : (
              <section className="card swap-panel">
                <h2>闪兑</h2>
                <p className="desc">请先连接钱包后再进行代币兑换。</p>
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

        {view === "guide" && (
          <OnboardingGuide
            currentStep={guideStep}
            walletReady={connected}
            backupDone={backupDone}
            transferDone={transferDone}
            onAction={onGuideAction}
            onComplete={() => {
              markTutorialDone();
              setTutorialDone(true);
              showToast("恭喜完成新手教程！");
              setView("home");
            }}
          />
        )}

        {view === "wallet" && (
          <section className="card wallet-settings">
            <h2>钱包管理</h2>
            {connected && session ? (
              <>
                <p className="full-address">{session.address}</p>
                <p className="desc">派生路径：{session.derivationPath}</p>
                <button
                  type="button"
                  className="btn-outline btn-block"
                  onClick={() => setBackupOpen(true)}
                >
                  查看 / 备份助记词
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
            {!tutorialDone && (
              <p className="hint">完成「教程」可获得完整上手体验</p>
            )}
          </section>
        )}
      </main>

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
            setGuideStep(3);
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
