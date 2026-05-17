import { useCallback, useEffect, useState } from "react";
import { broadcastRawTx, explorerTxUrl } from "../lib/ethereum";
import type { NetworkConfig } from "../lib/networks";
import {
  buildSwapTransaction,
  fetchSwapQuote,
  formatTokenAmount,
  pickCounterToken,
  type SwapQuote,
} from "../lib/swap";
import { getSwapTokens } from "../lib/tokens";
import {
  extractRawTransaction,
  signSwapTx,
  type WalletSession,
} from "../lib/tokenCore";

interface SwapPanelProps {
  session: WalletSession;
  password: string;
  network: NetworkConfig;
  onSuccess?: () => void;
}

export default function SwapPanel({
  session,
  password,
  network,
  onSuccess,
}: SwapPanelProps) {
  const tokens = getSwapTokens(network.id);
  const [fromId, setFromId] = useState("eth");
  const [toId, setToId] = useState("usdc");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const fromToken = tokens.find((t) => t.id === fromId);
  const toToken = tokens.find((t) => t.id === toId);

  useEffect(() => {
    if (tokens.length && !tokens.find((t) => t.id === toId)) {
      const next = pickCounterToken(network.id, fromId);
      if (next) setToId(next.id);
    }
  }, [fromId, toId, tokens, network.id]);

  const flip = () => {
    if (!fromToken || !toToken) return;
    setFromId(toId);
    setToId(fromId);
    setQuote(null);
    setError("");
    setTxHash(null);
  };

  const loadQuote = useCallback(async () => {
    if (!fromToken || !toToken || fromToken.id === toToken.id) return;
    setQuoting(true);
    setError("");
    setQuote(null);
    setTxHash(null);
    try {
      const q = await fetchSwapQuote(
        network.id,
        fromToken,
        toToken,
        amount,
        session.address
      );
      setQuote(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取报价失败");
    } finally {
      setQuoting(false);
    }
  }, [amount, fromToken, toToken, network.id, session.address]);

  const executeSwap = async () => {
    if (!fromToken || !toToken || !quote) return;
    setSwapping(true);
    setError("");
    try {
      const tx = await buildSwapTransaction(
        network.id,
        fromToken,
        toToken,
        quote,
        session.address
      );
      const signed = await signSwapTx(session, password, network, tx);
      const raw = extractRawTransaction(signed);
      const hash = await broadcastRawTx(network, raw);
      setTxHash(hash);
      setAmount("");
      setQuote(null);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "闪兑失败");
    } finally {
      setSwapping(false);
    }
  };

  if (network.id !== "mainnet") {
    return (
      <section className="card swap-panel">
        <h2>闪兑</h2>
        <p className="desc">
          链上闪兑目前仅支持<strong>以太坊主网</strong>。请先在右上角切换到「以太坊主网」。
        </p>
        <p className="swap-hint">测试网可先使用首页「转账」练习。</p>
      </section>
    );
  }

  if (!tokens.length || !fromToken || !toToken) {
    return null;
  }

  return (
    <section className="card swap-panel">
      <h2>闪兑</h2>
      <p className="desc">
        通过 ParaSwap 聚合路由询价，TokenCore <code>sign_tx</code> 本地签名后上链。
      </p>

      <div className="swap-field">
        <label>支付</label>
        <div className="swap-row">
          <select
            value={fromId}
            onChange={(e) => {
              setFromId(e.target.value);
              setQuote(null);
              const next = pickCounterToken(network.id, e.target.value);
              if (next) setToId(next.id);
            }}
          >
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
            }}
          />
        </div>
      </div>

      <button type="button" className="swap-flip" onClick={flip} aria-label="交换币种">
        ⇅
      </button>

      <div className="swap-field">
        <label>获得（预估）</label>
        <div className="swap-row">
          <select
            value={toId}
            onChange={(e) => {
              setToId(e.target.value);
              setQuote(null);
            }}
          >
            {tokens
              .filter((t) => t.id !== fromId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol}
                </option>
              ))}
          </select>
          <input
            type="text"
            readOnly
            placeholder="—"
            value={
              quote && toToken
                ? formatTokenAmount(quote.destAmount, toToken.decimals)
                : ""
            }
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-outline btn-block"
        onClick={loadQuote}
        disabled={quoting || !amount.trim() || fromId === toId}
      >
        {quoting ? "询价中…" : "获取报价"}
      </button>

      {quote && toToken && (
        <div className="swap-quote-box">
          <p>
            预计获得{" "}
            <strong>
              {formatTokenAmount(quote.destAmount, toToken.decimals)} {toToken.symbol}
            </strong>
          </p>
          <p className="swap-slippage">滑点容忍 1% · 链上成交以实际为准</p>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {txHash && (
        <p className="tx-success">
          闪兑已提交：
          <a href={explorerTxUrl(network, txHash)} target="_blank" rel="noreferrer">
            查看交易
          </a>
        </p>
      )}

      <button
        type="button"
        className="btn-primary btn-block btn-lg"
        onClick={executeSwap}
        disabled={swapping || !quote}
      >
        {swapping ? "签名并兑换中…" : "确认闪兑"}
      </button>
    </section>
  );
}
