import Link from "next/link";
import { getOptionalUser } from "@/lib/auth";
import { hasSupabasePublicEnv } from "@/lib/supabase/config";

export default async function HomePage() {
  const isConfigured = hasSupabasePublicEnv();
  const { user } = isConfigured ? await getOptionalUser() : { user: null };
  const primaryHref = user ? "/extract" : "/login";
  const primaryLabel = user ? "进入工作台" : "登录开始";

  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <div className="brand-block">
          <div className="brand-mark">STRUCTURED PROMPT WORKSPACE</div>
          <div className="brand-title">AI Prompt Structurer</div>
          <p>从需求提取到图片、文案和导出，一张工作流里完成。</p>
        </div>
        <div className="button-row">
          <Link href={primaryHref} className="primary-button">
            {primaryLabel}
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">Precision workflow for structured AI output</span>
          <h1>把原始需求转成结构化结果，再推进图片、文案与导出。</h1>
          <p>
            首页负责说明工作流与能力边界，进入工作台后直接开始操作。界面保持银白极简，重点放在输入、选择、结果和追溯。
          </p>
          <div className="button-row">
            <Link href={primaryHref} className="primary-button">
              {primaryLabel}
            </Link>
            <Link href="/settings" className="ghost-button">
              查看模型模板管理
            </Link>
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-panel">
            <strong>主流程</strong>
            <ol className="landing-steps">
              <li>文本解析固定字段，沉淀 Prompt</li>
              <li>图片生成与拆分编辑产出 Front / Back 成品图</li>
              <li>营销文案生成双语 Shopify 与 Facebook 内容</li>
              <li>确认数量模板并导出到 Google Sheets</li>
            </ol>
          </div>
          <div className="landing-visual-note">
            <span className="status-pill success">Ready</span>
            <p>设置页统一归档为“模型模板管理”，避免顶部导航过长，同时保留清晰的二级分组。</p>
          </div>
        </div>
      </section>

      <section className="landing-flow">
        <article className="landing-panel">
          <h2>工作流先于卡片</h2>
          <p>文本、图片、文案、导出不再拆成一堆入口卡片，而是按真实使用顺序组织成一条连续流程。</p>
          <ul className="landing-list">
            <li>文本解析负责结构化字段和最终 Prompt</li>
            <li>图片生成与编辑分别处理来源图和商品成品图</li>
            <li>文案页围绕素材组合与历史版本做编辑</li>
          </ul>
        </article>

        <article className="landing-panel">
          <h2>模型模板管理</h2>
          <p>模型配置、模板管理、数量模板统一归到一个主入口，进入后再用二级导航切换细分设置。</p>
          <ul className="landing-list">
            <li>文本模型和图片模型共用一套设置语义</li>
            <li>模板页突出字段约束和实时预览</li>
            <li>数量模板保留表格编辑与默认模板能力</li>
          </ul>
        </article>

        <article className="landing-panel">
          <h2>工具页直接进入操作</h2>
          <p>工作台页面只保留紧凑页头，首屏优先看到输入区、列表和结果，而不是大 banner。</p>
          <ul className="landing-list">
            <li>按钮收敛成明确主次</li>
            <li>关键文本优先完整显示</li>
            <li>长表格保留横向滚动，不强行压缩列宽</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
