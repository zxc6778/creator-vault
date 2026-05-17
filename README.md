# Easy Wallet

**小白友好型链上钱包助手** — 基于 imToken [TokenCore](https://github.com/consenlabs/token-core-monorepo) 浏览器 WASM 包 [`@consenlabs/tcx-wasm`](https://www.npmjs.com/package/@consenlabs/tcx-wasm) 构建。

清爽蓝白 UI，大按钮、移动端与桌面端自适应，可直接部署到 [Vercel](https://vercel.com)。

## 功能

| 模块 | 说明 |
|------|------|
| 极简创建 | 助记词创建 / 导入、一键生成助记词、风险提示勾选 |
| 链上操作 | ETH 主网 / Sepolia 测试网切换、余额查询、`sign_tx` 本地签名转账 |
| 闪兑 | ETH / USDC / USDT 一键兑换（[ParaSwap](https://www.paraswap.io) 聚合路由 + TokenCore 签名） |
| 新手引导 | 三步教程：创建钱包 → 备份助记词 → 发起转账 |
| 安全存储 | Keystore JSON 本地加密（`localStorage`），密码与助记词不上传服务器 |
| TokenCore | `create_keystore`、`derive_accounts`、`export_mnemonic`、`sign_tx` |

## 快速开始

**推荐（开发）：**

```bash
npm install
npm run dev
```

终端会显示地址，浏览器打开 **http://localhost:5173**（不要双击 `index.html`，文件协议无法加载 React / WASM）。

**预览构建结果：**

```bash
npm run build
npm run preview
```

或：

```bash
npm run build
node server.mjs
```

`postinstall` 会将 WASM 复制到 `public/tcx-wasm/`（与 npm 包版本一致）。

## 部署到 Vercel

1. 将本仓库推送到 GitHub / Gitee
2. 在 Vercel 导入项目，框架选择 **Vite**
3. 构建命令：`npm run build`，输出目录：`dist`
4. 根目录已包含 `vercel.json`（SPA 回退 + WASM MIME）

或使用 CLI：

```bash
npm i -g vercel
vercel
```

## 目录结构

```
src/
  App.tsx                 # 主界面
  components/
    WalletSetupModal.tsx  # 创建 / 导入 / 解锁
    BackupMnemonicModal.tsx
    OnboardingGuide.tsx   # 三步新手教程
    SendPanel.tsx         # 转账
  lib/
    tcxWasm.ts            # WASM 初始化
    tokenCore.ts          # 钱包会话、签名
    ethereum.ts           # JSON-RPC（余额、广播）
    networks.ts           # 主网 / 测试网配置
public/tcx-wasm/          # tcx-wasm 浏览器包
vercel.json
```

## 安全说明

- 助记词与 Keystore **仅在浏览器内**由 TokenCore 处理，本项目无后端账户系统。
- 密码用于解锁本机 Keystore；**遗忘密码需用助记词恢复**。
- 新手请先在 **Sepolia 测试网**练习，主网资产请谨慎操作。
- 公共电脑请勿保存钱包；助记词勿截图、勿通过网络发送。

## 参考

- [token-core-monorepo](https://github.com/consenlabs/token-core-monorepo)
- [tcx-wasm README](https://github.com/consenlabs/token-core-monorepo/tree/tenth-anniversary/token-core/tcx-wasm)

## License

Apache-2.0
