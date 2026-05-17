import type { TutorialStep } from "../types";

const STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "创建钱包",
    desc: "设置本地密码，由 TokenCore 生成或导入助记词，Keystore 加密后仅存于浏览器。",
    tip: "密码用于解锁本地加密文件，不会上传。",
  },
  {
    id: 2,
    title: "备份助记词",
    desc: "抄写 12 个英文单词并离线保存。丢失助记词将无法找回资产。",
    tip: "切勿截图或通过网络发送助记词。",
  },
  {
    id: 3,
    title: "发起转账",
    desc: "在首页查询余额、填写地址与金额，由 TokenCore 签名并广播。",
    tip: "新手建议先在 Sepolia 测试网练习转账。",
  },
  {
    id: 4,
    title: "闪兑代币",
    desc: "切换到以太坊主网，在「闪兑」页选择币种与数量，一键询价并兑换。",
    tip: "闪兑会消耗 Gas，请确保主网有足够 ETH。",
  },
];

interface OnboardingGuideProps {
  currentStep: number;
  walletReady: boolean;
  backupDone: boolean;
  transferDone: boolean;
  swapDone?: boolean;
  onAction: (step: number) => void;
  onComplete: () => void;
}

export default function OnboardingGuide({
  currentStep,
  walletReady,
  backupDone,
  transferDone,
  swapDone = false,
  onAction,
  onComplete,
}: OnboardingGuideProps) {
  const stepStatus = (id: number) => {
    if (id === 1) return walletReady;
    if (id === 2) return backupDone;
    if (id === 3) return transferDone;
    if (id === 4) return swapDone;
    return false;
  };

  const allDone = walletReady && backupDone && transferDone && swapDone;

  return (
    <section className="card guide-panel">
      <h2>新手教程</h2>
      <p className="desc">四步上手链上钱包，每步都有简明提示</p>

      <ol className="guide-steps">
        {STEPS.map((step) => {
          const done = stepStatus(step.id);
          const active = currentStep === step.id;
          return (
            <li key={step.id} className={`guide-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
              <div className="step-head">
                <span className="step-num">{done ? "✓" : step.id}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  <p className="step-tip">{step.tip}</p>
                </div>
              </div>
              {!done && (
                <button
                  type="button"
                  className="btn-outline btn-block"
                  onClick={() => onAction(step.id)}
                >
                  {step.id === 1
                    ? "去创建钱包"
                    : step.id === 2
                      ? "去备份助记词"
                      : step.id === 3
                        ? "去转账"
                        : "去闪兑"}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {allDone && (
        <button type="button" className="btn-primary btn-block btn-lg" onClick={onComplete}>
          完成教程
        </button>
      )}
    </section>
  );
}
