import init, {
  cache_keystore,
  clear_cached_keystore,
  create_keystore,
  derive_accounts,
  export_mnemonic,
  sign_message,
  sign_tx,
} from "@consenlabs/tcx-wasm";
import wasmUrl from "@consenlabs/tcx-wasm/tcx_wasm_bg.wasm?url";

let ready = false;

export const ETH_PATH = "m/44'/60'/0'/0/0";

export async function initTcxWasm(): Promise<void> {
  if (ready) return;
  await init(wasmUrl);
  ready = true;
}

export function isTcxReady(): boolean {
  return ready;
}

export {
  cache_keystore,
  clear_cached_keystore,
  create_keystore,
  derive_accounts,
  export_mnemonic,
  sign_message,
  sign_tx,
};
