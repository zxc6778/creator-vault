import { useState } from "react";
import {
  broadcastRawTx,
  explorerTxUrl,
} from "../lib/ethereum";
import {
  extractRawTransaction,
  signEthTransfer,
} from "../lib/tokenCore";
import type { WalletSession } from "../lib/tokenCore";
import type { NetworkConfig } from "../lib/networks";

interface SendPanelProps {
  session: WalletSession;
  password: string;
  network: NetworkConfig;
  onSuccess?: (txHash: string) => void;
}

export default function SendPanel({
  session,
  password,
  network,
  onSuccess,
}: SendPanelProps) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const submit = async () => {
    setError("");
    setTxHash(null);
    setBusy(true);
    try {
      const signed = await signEthTransfer(session, password, network, to, amount);
      const raw = extractRawTransaction(signed);
      const hash = await broadcastRawTx(network, raw);
      setTxHash(hash);
      setTo("");
      setAmount("");
      onSuccess?.(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "转账失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card send-panel">
      <h3>发起转账</h3>
      <p className="desc">使用 TokenCore <code>sign_tx</code> 本地签名后广播至 {network.label}</p>

      <div className="field">
        <label htmlFor="send-to">收款地址</label>
        <input
          id="send-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x..."
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label htmlFor="send-amount">金额（ETH）</label>
        <input
          id="send-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      {txHash && (
        <p className="tx-success">
          交易已提交：
          <a href={explorerTxUrl(network, txHash)} target="_blank" rel="noreferrer">
            在区块浏览器查看
          </a>
        </p>
      )}

      <button
        type="button"
        className="btn-primary btn-block btn-lg"
        onClick={submit}
        disabled={busy || !to.trim() || !amount.trim()}
      >
        {busy ? "签名并广播中…" : "确认转账"}
      </button>
    </section>
  );
}
