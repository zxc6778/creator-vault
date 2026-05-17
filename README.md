# VaultGuard · 自托管安全钱包

基于 [imToken TokenCore](https://github.com/consenlabs/token-core-monorepo)（`@consenlabs/tcx-wasm`）的网页自托管钱包：**私钥与助记词全程不离开用户设备**，签名在浏览器内由 WASM 完成。

## 核心特性

| 能力 | 说明 |
|------|------|
| 本地私钥管理 | Keystore / 助记词仅存 `localStorage`，经 TokenCore 加密 |
| 多链 EVM | Ethereum、BSC、Base；Sepolia 测试网 |
| 安全增强 | 离线助记词备份、转账二次确认（密码 + 可选 PIN）、合约/首转风险提示 |
| 隐私 | 无注册、无后端、不上传任何用户数据 |
| TokenCore 签名 | `create_keystore` / `derive_accounts` / `sign_tx` |

> **Solana（SOL）**：当前 `tcx-wasm` 公开包以 EVM / BTC 等为主，**暂不支持 SOL 链上签名**。界面已标注说明；EVM 三链可正常余额查询与转账。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 **http://localhost:5173**（请勿用 `file://` 直接打开 `index.html`）。

### 生产构建

```bash
npm run build
npm run preview
```

## 在线演示（GitHub Pages）

**https://zxc6778.github.io/creator-vault/**

部署命令（推送到 `zxc6778/creator-vault` 的 `gh-pages` 分支）：

```bash
npm run deploy:china
```

首次需在仓库 **Settings → Pages → Build and deployment → Branch** 选择 `gh-pages` / `/ (root)`。

## 部署到 Vercel

1. 将本仓库推送到 GitHub / Gitee
2. 在 [Vercel](https://vercel.com) 导入项目
3. 构建命令：`npm run build`，输出目录：`dist`
4. 根目录已包含 `vercel.json`（SPA 回退）

或使用 CLI：

```bash
npm i -g vercel
vercel --prod
```

## 技术栈

- Vite 6 + React 19 + TypeScript
- [@consenlabs/tcx-wasm](https://www.npmjs.com/package/@consenlabs/tcx-wasm)（安装后复制到 `public/tcx-wasm/`）
- 公共 RPC 查询余额（无自建后端）

## 安全提示

- 助记词 = 资产所有权，请**纸笔离线备份**，勿截图、勿上传网盘
- 本 Demo 未做硬件安全模块（TEE）加固，浏览器环境存在 XSS / 恶意扩展风险，大额资产请使用官方 imToken 或硬件钱包
- 测试网水龙头领取测试币后再练习转账

## 目录结构

```
src/
  lib/          # TokenCore 封装、RPC、网络、风险检测
  components/   # 钱包创建、转账确认、安全中心
  App.tsx       # 主界面（深色、桌面优先）
public/tcx-wasm # TokenCore WASM（postinstall 生成）
```

## 许可证

Apache-2.0（与 TokenCore 一致）。本仓库为社区演示作品，与 imToken 官方无隶属关系。
