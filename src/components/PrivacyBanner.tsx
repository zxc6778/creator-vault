export default function PrivacyBanner() {
  return (
    <aside className="privacy-banner" role="note">
      <span className="privacy-icon" aria-hidden>
        🔒
      </span>
      <div>
        <strong>完全本地 · 零上报</strong>
        <p>
          无私钥注册、无云端备份。助记词与 Keystore 仅存于本浏览器，签名由 TokenCore WASM
          在设备内完成。
        </p>
      </div>
    </aside>
  );
}
