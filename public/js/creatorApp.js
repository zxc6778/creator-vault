import {
  ensureTcx,
  createPasswordWallet,
  unlockKeystore,
  loadStoredKeystore,
  disconnectWallet,
  signMintAttestation,
  signTipIdentity,
  buildTipLink,
} from "./tcxBridge.js";

const FUND_LABELS = { tip: "\u6253\u8d4f", royalty: "\u7248\u7a0e", sale: "\u552e\u51fa" };
const COVERS = [
  "/covers/cover-1.svg",
  "/covers/cover-2.svg",
  "/covers/cover-3.svg",
];

const state = {
  tcxReady: false,
  tcxLoading: true,
  session: null,
  password: "",
  tab: "works",
  modal: null,
  walletOpen: false,
  tipLink: "#tip/preview",
  mintBusy: false,
  works: [
    { id: "w1", title: "\u9713\u8679\u96e8\u5df7", cover: COVERS[0], edition: "1 / 50", holders: 12, earned: 2.4, royaltyRate: 8 },
    { id: "w2", title: "\u9759\u7269 \u00b7 \u6668\u5149", cover: COVERS[1], edition: "3 / 20", holders: 8, earned: 1.85, royaltyRate: 10 },
    { id: "w3", title: "\u58f0\u6ce2\u6863\u6848 #07", cover: COVERS[2], edition: "1 / 1", holders: 1, earned: 5.2, royaltyRate: 5 },
  ],
  flows: [
    { id: "f1", type: "tip", amount: 0.15, currency: "ETH", from: "fan_aurora", workTitle: "\u9713\u8679\u96e8\u5df7", at: "\u4eca\u5929 14:32" },
    { id: "f2", type: "royalty", amount: 0.08, currency: "ETH", from: "\u4e8c\u6b21\u6d41\u8f6c", workTitle: "\u9759\u7269 \u00b7 \u6668\u5149", at: "\u4eca\u5929 11:05" },
    { id: "f3", type: "sale", amount: 0.6, currency: "ETH", from: "collector_m", workTitle: "\u58f0\u6ce2\u6863\u6848 #07", at: "\u6628\u5929 20:18" },
  ],
};

function shortAddr(a) {
  return a.slice(0, 6) + "\u2026" + a.slice(-4);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

function fundSum() {
  const s = { tip: 0, royalty: 0, sale: 0 };
  state.flows.forEach((f) => { s[f.type] += f.amount; });
  return s;
}

function balance() {
  return state.flows.reduce((a, f) => a + f.amount, 0) + state.works.reduce((a, w) => a + w.earned, 0) * 0.1;
}

function render() {
  const sum = fundSum();
  const connected = !!state.session;
  document.getElementById("app").innerHTML = `
    <header class="header">
      <div class="brand"><h1>Creator Vault</h1><p>\u4f5c\u54c1\u4e0e\u8d44\u91d1\uff0c\u4ec5\u6b64\u800c\u5df2</p>
      ${state.tcxReady ? '<span class="tcx-badge">TokenCore</span>' : ""}</div>
      <div class="balance-pill"><span>\u53ef\u63d0\u73b0</span><strong>${balance().toFixed(2)} ETH</strong></div>
    </header>
    <button type="button" class="wallet-btn ${connected ? "connected" : ""}" id="walletBtn" ${state.tcxLoading ? "disabled" : ""}>
      ${state.tcxLoading ? "TokenCore \u52a0\u8f7d\u4e2d\u2026" : connected ? shortAddr(state.session.address) : "\u8fde\u63a5\u521b\u4f5c\u8005\u94b1\u5305"}
    </button>
    <section class="actions">
      <button type="button" class="action-card" data-action="mint"><div class="icon">\u2726</div><span>\u94f8\u9020 NFT</span></button>
      <button type="button" class="action-card" data-action="royalty"><div class="icon">\u25c8</div><span>\u67e5\u770b\u7248\u7a0e</span></button>
      <button type="button" class="action-card" data-action="tip"><div class="icon">\u2661</div><span>\u7c89\u4e1d\u6253\u8d4f</span></button>
    </section>
    <nav class="tabs">
      <button type="button" class="tab ${state.tab === "works" ? "active" : ""}" data-tab="works">\u6211\u7684\u4f5c\u54c1</button>
      <button type="button" class="tab ${state.tab === "funds" ? "active" : ""}" data-tab="funds">\u8d44\u91d1\u6d41\u6c34</button>
    </nav>
    <main>
      ${state.tab === "works" ? `<section class="works-list">${state.works.map((w) => `
        <article class="work-card"><img class="work-cover" src="${w.cover}" alt="" />
        <div class="work-info"><h3>${w.title}</h3>
        <div class="work-meta"><span>${w.edition}</span><span>${w.holders} \u4f4d\u6301\u6709\u8005</span><span>\u7248\u7a0e ${w.royaltyRate}%</span>
        ${w.mintSignature ? '<span class="signed-badge">\u5df2\u7b7e\u540d</span>' : ""}</div>
        <div class="work-stat"><label>\u7d2f\u8ba1\u6536\u76ca</label><strong>${w.earned.toFixed(2)} ETH</strong></div>
        </div></article>`).join("")}</section>` : `
        <section><div class="funds-summary">
          <div class="summary-item tip"><label>\u6253\u8d4f</label><strong>${sum.tip.toFixed(2)}</strong></div>
          <div class="summary-item royalty"><label>\u7248\u7a0e</label><strong>${sum.royalty.toFixed(2)}</strong></div>
          <div class="summary-item sale"><label>\u552e\u51fa</label><strong>${sum.sale.toFixed(2)}</strong></div>
        </div><div class="funds-list">${state.flows.map((f) => `
          <div class="fund-row"><div class="fund-badge ${f.type}">${FUND_LABELS[f.type]}</div>
          <div class="fund-detail"><div class="title">${f.from}${f.workTitle ? " \u00b7 " + f.workTitle : ""}</div>
          <div class="sub">${FUND_LABELS[f.type]}</div></div>
          <div class="fund-amount"><strong>+${f.amount} ${f.currency}</strong><time>${f.at}</time></div></div>`).join("")}
        </div></section>`}
    </main>`;

  document.getElementById("walletBtn").onclick = onWalletClick;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    b.onclick = () => { state.tab = b.dataset.tab; render(); };
  });
  document.querySelectorAll("[data-action]").forEach((b) => {
    b.onclick = () => openAction(b.dataset.action);
  });
}

function onWalletClick() {
  if (state.session) {
    disconnectWallet();
    state.session = null;
    state.password = "";
    state.tipLink = "#tip/preview";
    toast("\u5df2\u65ad\u5f00\u8fde\u63a5");
    render();
    return;
  }
  if (!state.tcxReady) return toast("TokenCore \u52a0\u8f7d\u4e2d");
  state.walletOpen = true;
  renderWalletModal();
}

function openAction(action) {
  if ((action === "mint" || action === "tip") && !state.session) {
    toast("\u8bf7\u5148\u8fde\u63a5\u94b1\u5305");
    state.walletOpen = true;
    renderWalletModal();
    return;
  }
  state.modal = action;
  renderModal();
}

function renderWalletModal() {
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  if (!state.walletOpen) {
    overlay.classList.add("hidden");
    return;
  }
  const hasStore = !!loadStoredKeystore();
  overlay.classList.remove("hidden");
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      state.walletOpen = false;
      overlay.classList.add("hidden");
    }
  };
  modal.innerHTML = `
    <h2>\u521b\u5efa / \u89e3\u9501\u94b1\u5305</h2>
    <p class="desc">TokenCore\uFF08tcx-wasm\uFF09\u5728\u6d4f\u89c8\u5668\u672c\u5730\u6d3e\u751f\u5730\u5740\u4e0e\u7b7e\u540d\u3002</p>
    <div class="field"><label>\u5bc6\u7801</label><input type="password" id="wPass" placeholder="\u81f3\u5c11 8 \u4f4d" /></div>
    ${!hasStore ? `<div class="field"><label>\u786e\u8ba4\u5bc6\u7801</label><input type="password" id="wConfirm" /></div>
    <div class="field"><label>\u52a9\u8bb0\u8bcd\uFF08\u53ef\u9009\uFF09</label><textarea id="wMnemonic" rows="2"></textarea></div>` : ""}
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="wCancel">\u53d6\u6d88</button>
      ${hasStore ? `<button type="button" class="btn-primary" id="wUnlock">\u89e3\u9501</button>` : ""}
      <button type="button" class="btn-primary" id="wCreate">${hasStore ? "\u65b0\u5efa" : "\u521b\u5efa\u5e76\u8fde\u63a5"}</button>
    </div>`;
  modal.onclick = (e) => e.stopPropagation();
  document.getElementById("wCancel").onclick = () => {
    state.walletOpen = false;
    overlay.classList.add("hidden");
  };
  if (hasStore) {
    document.getElementById("wUnlock").onclick = async () => {
      try {
        const ks = loadStoredKeystore();
        const pass = document.getElementById("wPass").value;
        state.session = await unlockKeystore(ks, pass);
        state.password = pass;
        const sig = await signTipIdentity(state.session, pass);
        state.tipLink = buildTipLink(state.session.address, sig);
        state.walletOpen = false;
        overlay.classList.add("hidden");
        toast("TokenCore \u94b1\u5305\u5df2\u8fde\u63a5");
        render();
      } catch (e) {
        toast(e.message || "\u89e3\u9501\u5931\u8d25");
      }
    };
  }
  document.getElementById("wCreate").onclick = async () => {
    try {
      const pass = document.getElementById("wPass").value;
      if (pass.length < 8) return toast("\u5bc6\u7801\u81f3\u5c11 8 \u4f4d");
      const confirm = document.getElementById("wConfirm");
      if (confirm && pass !== confirm.value) return toast("\u4e24\u6b21\u5bc6\u7801\u4e0d\u4e00\u81f4");
      const mnemonic = document.getElementById("wMnemonic")?.value || "";
      state.session = await createPasswordWallet(pass, mnemonic);
      state.password = pass;
      const sig = await signTipIdentity(state.session, pass);
      state.tipLink = buildTipLink(state.session.address, sig);
      state.walletOpen = false;
      overlay.classList.add("hidden");
      toast("TokenCore \u94b1\u5305\u5df2\u8fde\u63a5");
      render();
    } catch (e) {
      toast(e.message || "\u521b\u5efa\u5931\u8d25");
    }
  };
}

function renderModal() {
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  if (!state.modal) {
    if (!state.walletOpen) overlay.classList.add("hidden");
    return;
  }
  overlay.classList.remove("hidden");
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      state.modal = null;
      overlay.classList.add("hidden");
    }
  };
  modal.onclick = (e) => e.stopPropagation();

  if (state.modal === "mint") {
    modal.innerHTML = `
      <h2>\u94f8\u9020\u4f5c\u54c1</h2>
      <p class="desc">TokenCore \u672c\u5730\u7b7e\u540d\u94f8\u9020\u610f\u5411\u3002\u5730\u5740\uFF1A${state.session.address}</p>
      <div class="field"><label>\u540d\u79f0</label><input id="mTitle" /></div>
      <div class="field"><label>\u6570\u91cf</label><input id="mSupply" type="number" value="50" /></div>
      <div class="field"><label>\u7248\u7a0e %</label><input id="mRoyalty" type="number" value="8" /></div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="mCancel">\u53d6\u6d88</button>
        <button type="button" class="btn-primary" id="mOk">\u4e00\u952e\u94f8\u9020</button>
      </div>`;
    document.getElementById("mCancel").onclick = () => { state.modal = null; overlay.classList.add("hidden"); };
    document.getElementById("mOk").onclick = async () => {
      const title = document.getElementById("mTitle").value.trim();
      if (!title) return;
      try {
        const supply = +document.getElementById("mSupply").value || 1;
        const royalty = +document.getElementById("mRoyalty").value || 5;
        const { signature } = await signMintAttestation(state.session, state.password, title, supply, royalty);
        state.works.unshift({
          id: "w" + Date.now(),
          title,
          cover: COVERS[state.works.length % COVERS.length],
          edition: `0 / ${supply}`,
          holders: 0,
          earned: 0,
          royaltyRate: royalty,
          mintSignature: signature,
        });
        state.modal = null;
        overlay.classList.add("hidden");
        toast(`\u300c${title}\u300d\u5df2\u7b7e\u540d`);
        render();
      } catch (e) {
        toast(e.message || "\u7b7e\u540d\u5931\u8d25");
      }
    };
  } else if (state.modal === "royalty") {
    const total = state.works.reduce((s, w) => s + w.earned * (w.royaltyRate / 100), 0);
    modal.innerHTML = `<h2>\u7248\u7a0e\u603b\u89c8</h2><p class="desc">\u7d2f\u8ba1 ${total.toFixed(3)} ETH</p>
      <div class="royalty-list">${state.works.map((w) => `<div class="royalty-item"><span>${w.title}</span><strong>${w.royaltyRate}%</strong></div>`).join("")}
      <button type="button" class="btn-primary" id="mOk" style="width:100%;margin-top:12px">\u77e5\u9053\u4e86</button>`;
    document.getElementById("mOk").onclick = () => { state.modal = null; overlay.classList.add("hidden"); };
  } else if (state.modal === "tip") {
    modal.innerHTML = `<h2>\u7c89\u4e1d\u6253\u8d4f</h2><p class="desc">${state.session.address}</p>
      <div class="tip-link-box"><input readonly id="tipIn" value="${state.tipLink}" /><button type="button" class="copy-btn" id="tipCopy">\u590d\u5236</button></div>
      <button type="button" class="btn-primary" id="mOk" style="width:100%;margin-top:12px">\u5173\u95ed</button>`;
    const copy = () => { navigator.clipboard.writeText(state.tipLink); toast("\u5df2\u590d\u5236"); };
    document.getElementById("tipCopy").onclick = copy;
    document.getElementById("mOk").onclick = () => { state.modal = null; overlay.classList.add("hidden"); };
  }
}

// Show UI immediately (avoid black screen while WASM loads)
render();

ensureTcx()
  .then(() => {
    state.tcxReady = true;
    state.tcxLoading = false;
    render();
  })
  .catch((err) => {
    console.error(err);
    state.tcxLoading = false;
    toast("TokenCore WASM \u52a0\u8f7d\u5931\u8d25");
    render();
  });
