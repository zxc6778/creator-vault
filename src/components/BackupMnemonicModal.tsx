import { useState } from "react";
import { exportWalletMnemonic, markBackupConfirmed } from "../lib/tokenCore";
import type { WalletSession } from "../lib/tokenCore";

interface BackupMnemonicModalProps {
  open: boolean;
  session: WalletSession;
  password: string;
  onDone: () => void;
}

export default function BackupMnemonicModal({
  open,
  session,
  password,
  onDone,
}: BackupMnemonicModalProps) {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const loadMnemonic = async () => {
    setBusy(true);
    setError("");
    try {
      const phrase = await exportWalletMnemonic(session, password);
      setMnemonic(phrase);
      setRevealed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (!confirmed) {
      setError("请确认已抄写并妥善保管助记词");
      return;
    }
    markBackupConfirmed();
    onDone();
  };

  return (
    <div className="overlay" role="presentation">
      <div className="modal backup-modal" role="dialog">
        <h2>备份助记词</h2>
        <p className="desc">
          这是恢复钱包的唯一凭证。请抄写在纸上，离线保存。任何人拿到助记词都可以转走你的资产。
        </p>

        {!revealed ? (
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={loadMnemonic}
            disabled={busy}
          >
            {busy ? "解密中…" : "显示助记词"}
          </button>
        ) : (
          <div className="mnemonic-display" aria-live="polite">
            {mnemonic}
          </div>
        )}

        {revealed && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            我已抄写助记词并妥善保管
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={finish}
            disabled={!revealed}
          >
            完成备份
          </button>
        </div>
      </div>
    </div>
  );
}
