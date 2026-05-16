const ETH_PATH = "m/44'/60'/0'/0/0";
const STORAGE_KEY = "creator-vault-keystore";
const WASM_URL = "/tcx-wasm/tcx_wasm_bg.wasm";

let wasmMod = null;
let ready = false;

export async function ensureTcx() {
  if (ready) return wasmMod;
  const mod = await import("/tcx-wasm/tcx_wasm.js");
  await mod.default(WASM_URL);
  wasmMod = mod;
  ready = true;
  return mod;
}

export function loadStoredKeystore() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveKeystore(json) {
  localStorage.setItem(STORAGE_KEY, json);
}

export function clearStoredKeystore() {
  localStorage.removeItem(STORAGE_KEY);
  if (wasmMod) wasmMod.clear_cached_keystore();
}

export async function createPasswordWallet(password, mnemonic) {
  const w = await ensureTcx();
  const param = { password, network: "MAINNET" };
  if (mnemonic?.trim()) param.mnemonic = mnemonic.trim();
  const keystoreJson = w.create_keystore(JSON.stringify(param));
  return unlockKeystore(keystoreJson, password, true);
}

export async function unlockKeystore(keystoreJson, password, persist = true) {
  const w = await ensureTcx();
  w.cache_keystore(keystoreJson);
  const accounts = JSON.parse(
    w.derive_accounts(
      JSON.stringify({
        key: password,
        derivations: [
          {
            chain: "ETHEREUM",
            derivationPath: ETH_PATH,
            chainId: "1",
            network: "MAINNET",
          },
        ],
      })
    )
  );
  const eth = accounts[0];
  if (!eth?.address) throw new Error("\u65e0\u6cd5\u6d3e\u751f\u4ee5\u592a\u5740\u5740\uff0c\u8bf7\u68c0\u67e5\u5bc6\u7801");
  if (persist) saveKeystore(keystoreJson);
  return {
    address: eth.address,
    keystoreJson,
    derivationPath: eth.derivationPath || ETH_PATH,
  };
}

export function disconnectWallet() {
  if (wasmMod) wasmMod.clear_cached_keystore();
}

export async function signMintAttestation(session, password, title, supply, royalty) {
  const w = await ensureTcx();
  w.cache_keystore(session.keystoreJson);
  const payload = JSON.stringify({
    action: "creator-vault-mint",
    title,
    supply,
    royaltyRate: royalty,
    address: session.address,
    ts: Date.now(),
  });
  const result = JSON.parse(
    w.sign_message(
      JSON.stringify({
        key: password,
        chain: "ETHEREUM",
        derivationPath: session.derivationPath,
        input: { message: payload, signatureType: "PersonalSign" },
      })
    )
  );
  if (!result.signature) throw new Error("\u7b7e\u540d\u5931\u8d25");
  return { signature: result.signature, payload };
}

export async function signTipIdentity(session, password) {
  const w = await ensureTcx();
  w.cache_keystore(session.keystoreJson);
  const result = JSON.parse(
    w.sign_message(
      JSON.stringify({
        key: password,
        chain: "ETHEREUM",
        derivationPath: session.derivationPath,
        input: {
          message: `creator-vault-tip:${session.address}`,
          signatureType: "PersonalSign",
        },
      })
    )
  );
  return result.signature;
}

export function buildTipLink(address, sig) {
  const id = address.replace(/^0x/i, "").slice(0, 16);
  const base = `${location.origin}${location.pathname}#tip/${id}`;
  return sig ? `${base}?sig=${encodeURIComponent(sig.slice(0, 18))}` : base;
}
