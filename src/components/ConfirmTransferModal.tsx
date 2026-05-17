import { useState } from "react";
import { riskLabel, type TransferRiskReport } from "../lib/security";
import type { NetworkConfig } from "../lib/networks";
import { verifyTransferPin } from "../lib/tokenCore";

interface ConfirmTransferModalProps {
  open: boolean;
  network: NetworkConfig;
  from: string;
  to: string;
  amount: string;
  risk: TransferRiskReport | null;
  requirePin: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  busy: boolean;
}

export default function ConfirmTransferModal({
  open,
  network,
  from,
  to,
  amount,
  risk,
  requirePin,
  onClose,
  onConfirm,
  busy,
}: ConfirmTransferModalProps) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleConfirm = () => {
    setError("");
    if (!checked) {
      setError("请勾选已核对交易信息");
      return;
    }
    if (!password) {
      setError("请输入钱包密码以完成二次验证");
      return;
    }
    if (requirePin && !verifyTransferPin(pin)) {
      setError("转账 PIN 不正确");
      return;
    }
    onConfirm(password);
  };

  const level = risk?.level ?? "medium";

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className="modal confirm-transfer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-transfer-title"
      >
        <h2 id="confirm-transfer-title">二次确认转账</h2>
        <p className="desc">签名在本地由 TokenCore 完成，请逐项核对后再提交。</p>

        <div className={`risk-alert risk-${level}`}>
          <strong>{risk ? riskLabel(risk.level) : "风险检测中"}</strong>
          <ul>
            {(risk?.messages ?? ["正在分析…"]).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <dl className="tx-summary">
          <div>
            <dt>网络</dt>
            <dd>{network.label}</dd>
          </div>
          <div>
            <dt>发送</dt>
            <dd className="mono">{from}</dd>
          </div>
          <div>
            <dt>收款</dt>
            <dd className="mono">{to}</dd>
          </div>
          <div>
            <dt>金额</dt>
            <dd>
              {amount} {network.nativeSymbol}
            </dd>
          </div>
        </dl>

        <label className="checkbox-row">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          我已核对地址、金额与网络，并了解链上交易不可撤销
        </label>

        {requirePin && (
          <div className="field">
            <label htmlFor="transfer-pin">转账 PIN（6 位）</label>
            <input
              id="transfer-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoComplete="off"
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="confirm-password">钱包密码（二次验证）</label>
          <input
            id="confirm-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={busy}>
            {busy ? "签名中…" : "确认并签名"}
          </button>
        </div>
      </div>
    </div>
  );
}
