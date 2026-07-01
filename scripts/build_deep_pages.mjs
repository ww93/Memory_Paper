import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

function escJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function hotspotButtons(items) {
  return items.map((item, idx) => (
    `<button class="hotspot" style="--x:${item.x}%;--y:${item.y}%;" data-hotspot="${item.key}" aria-label="${item.title}">${idx + 1}</button>`
  )).join("\n");
}

function sourceLinks(items) {
  return items.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");
}

function badges(items) {
  return items.map((item) => `<span class="badge">${item}</span>`).join("");
}

function pageTemplate(page) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${page.title}</title>
<script>
window.MathJax = {
  tex: { inlineMath: [['\\\\(', '\\\\)'], ['$', '$']], displayMath: [['\\\\[', '\\\\]']] },
  svg: { fontCache: 'global' }
};
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
<link rel="stylesheet" href="../../assets/paper-deep.css" />
</head>
<body style="--accent:${page.accent};--accent-2:${page.accent2};">
<main class="page">
  <div class="topbar">
    <a class="back-link" href="../../">← 返回论文列表</a>
    <nav class="source-links">${sourceLinks(page.sources)}</nav>
  </div>
  <section class="hero">
    <span class="eyebrow">${page.eyebrow}</span>
    <h1>${page.h1}</h1>
    <p class="subtitle">${page.subtitle}</p>
    <div class="badge-row">${badges(page.badges)}</div>
  </section>
${page.body}
  <section class="section">
    <h2>来源与核验边界</h2>
    ${page.sourceNote}
  </section>
</main>
<script>window.paperHotspots = ${escJson(page.hotspots)};</script>
<script src="../../assets/paper-deep.js"></script>
</body>
</html>
`;
}

const pages = [
  {
    id: "memagent",
    title: "MemAgent 深度解读：Multi-Conv RL Memory Agent",
    h1: "MemAgent 深度解读",
    eyebrow: "STREAMING MEMORY AGENT",
    accent: "#2563eb",
    accent2: "#0f766e",
    sources: [
      { label: "arXiv", href: "https://arxiv.org/abs/2507.02259" },
      { label: "PDF", href: "https://arxiv.org/pdf/2507.02259" },
      { label: "Project", href: "https://memagent-sialab.github.io/" }
    ],
    badges: ["Chunk streaming", "Overwrite memory", "Multi-Conv RL", "DAPO/GRPO", "3.5M token QA"],
    subtitle: "这篇论文的关键设计不是继续扩展一次性上下文窗口，而是把超长输入改写成可训练的流式读写任务：LLM 每次只读一个 chunk，携带上一轮 memory，输出新的固定长度 memory，最后仅用问题和最终 memory 作答。",
    hotspots: {
      framework: {
        baseline: {
          label: "Figure 2 / baseline",
          title: "长上下文 LLM 的瓶颈",
          body: "上半部分表示常规长上下文模型：所有文本 chunk 和问题都进入同一次上下文。即使名义窗口很长，注意力计算和有效利用都会随长度出现成本或性能问题。",
          points: ["论文把这种方式称为 monolithic block 处理。", "Figure 1 显示多种长上下文基线在 RULER-HotpotQA 上随长度增长出现性能断崖。"]
        },
        chunks: {
          label: "Figure 2 / text chunks",
          title: "把文档变成流",
          body: "MemAgent 不要求模型一次看完整文档，而是把文档切成连续 chunk。每轮输入由 problem、previous memory 和当前 section 组成。",
          points: ["训练时论文使用 8K 上下文窗口，其中约 1024 tokens 给 memory，约 5000 tokens 给 document chunk。", "推理复杂度随 chunk 数线性增长。"]
        },
        memory: {
          label: "Figure 2 / memory tokens",
          title: "固定长度 memory 是可覆盖状态",
          body: "每次读完 chunk 后，模型生成一个新的 memory，覆盖旧 memory。memory 是普通 token 序列，论文强调它可读、可检查，而不是外部向量或隐藏态。",
          points: ["memory 长度不随文档长度增长。", "覆盖机制让系统可以处理百万级输入，但也带来丢失早期证据的风险。"]
        },
        recurrent: {
          label: "Figure 2 / recurrent reader",
          title: "LLM 被重塑为 recurrent reader",
          body: "下半部分的多个 LLM 方块不是多个模型，而是同一个模型在多个 chunk 上反复执行读写。它像一个会做笔记的读者，而不是一次性全文阅读器。",
          points: ["Context-Processing 阶段只负责更新 memory。", "Answer-Generation 阶段才根据最终 memory 输出答案。"]
        },
        answer: {
          label: "Figure 2 / answer",
          title: "最终答案只依赖最终 memory",
          body: "文档流结束后，模型不再回看所有 chunk，而是用 problem 和最终 memory 作答。因此 RL 必须让 memory 学会保留 answer-critical facts。",
          points: ["最终奖励来自答案是否正确。", "没有逐步标注每轮 memory 应该写什么。"]
        }
      }
    },
    body: `
  <section class="section">
    <h2>1. 设计思路：把长上下文问题改写成记忆代理问题</h2>
    <p class="lead">MemAgent 的出发点是：单纯扩大上下文窗口并不能保证模型在百万 token 级输入上稳定找到证据。论文把“读完整文档”拆成许多局部读写动作，让模型在固定窗口内持续维护一个任务相关 memory。</p>
    <div class="grid three">
      <div class="mini-card"><span class="kpi">固定 M</span><h3>memory 不增长</h3><p>旧 memory 被新 memory 覆盖，避免摘要无限追加导致窗口再次爆炸。</p></div>
      <div class="mini-card"><span class="kpi">O(N)</span><h3>线性成本</h3><p>每个 chunk 的计算近似固定，总成本随 chunk 数线性增长。</p></div>
      <div class="mini-card"><span class="kpi">RL</span><h3>以最终答案塑造记忆</h3><p>模型不是模仿人工摘要，而是通过 QA reward 学习哪些信息值得保留。</p></div>
    </div>
    <div class="note">如果把 RAG 看成“外部检索后拼上下文”，MemAgent 更像“模型内部学会边读边写笔记”。它解决的是超长输入处理，不直接解决用户长期画像、权限、遗忘或记忆治理。</div>
  </section>

  <section class="section">
    <h2>2. 论文原图框架：Figure 2 的五个关键部件</h2>
    <div class="figure-layout" data-hotspot-root="framework">
      <div class="figure-shell">
        <div class="figure-stage">
          <div class="figure-canvas">
          <img src="../../assets/frameworks/memagent-figure2.png" alt="MemAgent Figure 2: Solving Long-Context Task with Memory Agent via RL" />
          ${hotspotButtons([
            { key: "baseline", title: "长上下文 LLM", x: 48, y: 17 },
            { key: "chunks", title: "文本 chunk 流", x: 13, y: 68 },
            { key: "memory", title: "固定 memory", x: 31, y: 53 },
            { key: "recurrent", title: "递归读写", x: 54, y: 60 },
            { key: "answer", title: "最终答案", x: 88, y: 46 }
          ])}
          </div>
        </div>
        <p class="figure-caption">论文 Figure 2：上半部分是常规长上下文 LLM；下半部分是 MemAgent 分块读取、更新 memory、最终回答的框架。页面保留论文原图，并在关键部件上叠加解释热点。</p>
      </div>
      <aside class="hotspot-panel">
        <p class="label" data-hot-label></p>
        <h3 data-hot-title></h3>
        <p data-hot-body></p>
        <div data-hot-points></div>
      </aside>
    </div>
  </section>

  <section class="section">
    <h2>3. 生成模型视角：读路径和写路径如何分解</h2>
    <p class="lead">论文 Figure 4 把 MemAgent 写成一个 latent memory variable 模型。设长文档被切成 \\(c^1, ..., c^K\\)，每步 memory 为 \\(m^k\\)。模型在第 k 步先读取 \\(c^k\\)，再根据 \\(c^k\\) 与 \\(m^{k-1}\\) 生成新的 \\(m^k\\)。</p>
    <div class="wide-figure">
      <img src="../../assets/frameworks/memagent-figure4.png" alt="MemAgent Figure 4: architecture and graphical model" />
      <p class="figure-caption">论文 Figure 4：左侧是 Controller / Read Head / Write Head / Memory 的概念架构，右侧是 chunk 与 latent memory 的图模型。</p>
    </div>
    <div class="formula"><code>p(x_1:N) = sum_{m^{1:K-1}} product_k p(c^k | m^{k-1}) p(m^k | c^k, m^{k-1})</code></div>
    <div class="split-list">
      <div class="mini-card"><h3>Read path</h3><p>读路径让当前 chunk 在上一轮 memory 条件下被处理，等价于“带着笔记读下一页”。</p></div>
      <div class="mini-card"><h3>Write path</h3><p>写路径生成下一轮 memory。这里的关键不是追加，而是覆盖，因此必须学会压缩与取舍。</p></div>
    </div>
  </section>

  <section class="section">
    <h2>4. Multi-Conv RL：为什么不是普通摘要训练</h2>
    <div class="steps">
      <div class="step"><b>Context-Processing</b><p>输入 problem、previous memory、当前 section，输出 updated memory。这个阶段可能重复很多轮。</p></div>
      <div class="step"><b>Answer-Generation</b><p>读完整个 stream 后，输入 problem 与最终 memory，要求模型输出 boxed answer。</p></div>
      <div class="step"><b>Independent-context multi-conversation</b><p>论文扩展 DAPO/GRPO，让一个长文档任务对应多个上下文独立的 conversation，而奖励仍由最终答案决定。</p></div>
      <div class="step"><b>Group-relative advantage</b><p>GRPO 中同一输入采样一组响应，用组内 reward 归一化优势，避免单独训练 value function。</p></div>
    </div>
    <div class="note good">这个训练设计把“记忆是否好”推迟到最终答案来判断，因此模型会倾向保留对 QA 有用的证据，而不是生成看起来完整但无关的摘要。</div>
  </section>

  <section class="section">
    <h2>5. 实验怎么读：不是窗口越长越强，而是 memory 是否稳定</h2>
    <div class="table-wrap"><table><thead><tr><th>问题</th><th>论文结果</th><th>设计含义</th></tr></thead><tbody>
      <tr><td>超长外推</td><td>摘要报告：在 32K 长度训练后外推到 3.5M QA，性能损失小于 5%。</td><td>模型没有在训练中见过 3.5M 上下文；能力来自流式复用同一个读写策略。</td></tr>
      <tr><td>Table 2</td><td>RL-MemAgent-14B 在 3.5M 长度上为 78.12，RL-MemAgent-7B 为 71.09。</td><td>长输入不是一次性注意力可见，而是被压缩进最终 memory。</td></tr>
      <tr><td>RULER OOD</td><td>摘要称在 512K RULER 上达到 95%+。</td><td>说明方法不是只对 HotpotQA 格式有效，但仍需看任务类型。</td></tr>
      <tr><td>消融</td><td>论文 Figure 5 表明，仅加 memory 但没有 RL 时性能仍随长度下降。</td><td>固定 memory 结构只是容器，RL 才让模型学会如何写这个容器。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>6. 工程启发与边界</h2>
    <div class="grid two">
      <div class="mini-card"><h3>适用</h3><p>长文档 QA、长日志审计、百万 token 研究报告读取、必须在线性成本下处理连续输入的任务。</p></div>
      <div class="mini-card"><h3>不适用或未覆盖</h3><p>用户长期画像治理、可编辑记忆、敏感信息删除、多主体权限隔离。这些不是 MemAgent 论文的目标。</p></div>
    </div>
    <div class="note warn">最重要的失败模式是 overwrite 的不可逆性：如果早期关键证据没有进入 memory，后面无法再从原文恢复。生产系统需要审计和回放机制来弥补。</div>
  </section>`,
    sourceNote: `<p class="source-note">本页依据 arXiv:2507.02259 与项目页整理。实验数值仅引用论文摘要、Figure 1、Figure 5 与 Table 2 中出现的结果；未把“arbitrarily long”扩展为无限可靠推理。</p>`
  },

  {
    id: "umem",
    title: "UMem 深度解读：Unified Memory Extraction and Management",
    h1: "UMem 深度解读",
    eyebrow: "GENERALIZABLE MEMORY",
    accent: "#0f766e",
    accent2: "#7c3aed",
    sources: [
      { label: "arXiv", href: "https://arxiv.org/abs/2602.10652" },
      { label: "PDF", href: "https://arxiv.org/pdf/2602.10652" }
    ],
    badges: ["Mem-Optimizer", "Semantic Neighborhood", "Marginal Utility Reward", "GRPO", "Self-evolving agent"],
    subtitle: "UMem 关注的是自演化 agent 的记忆如何从经验中泛化。它把 memory extraction 和 memory management 统一成一个可训练的 Mem-Optimizer，并用语义邻域内的边际收益来避免实例噪声。",
    hotspots: {
      framework: {
        neighborhood: {
          label: "Figure 2 / Semantic Neighborhood",
          title: "语义邻域是泛化约束",
          body: "给定查询 q，UMem 不只评价 q 本身，而是检索语义相近的 Top-N queries。候选记忆必须能帮助这一组相邻任务，才被认为有泛化价值。",
          points: ["论文消融显示 N=3 在任务特异性和跨任务迁移之间较好。", "N 太小容易过拟合当前样本，N 太大则引入噪声。"]
        },
        bank: {
          label: "Figure 2 / Memory Bank",
          title: "Memory bank 是 agent 的外部可演化参数",
          body: "Executor 的主模型参数冻结，真正随经验变化的是外部 memory bank。Mem-Optimizer 的动作会改变这个 bank。",
          points: ["论文把 memory bank 表述为 key-value 结构。", "记忆质量直接限制冻结 executor 的表现上限。"]
        },
        executor: {
          label: "Figure 2 / Frozen Executor",
          title: "Executor 生成轨迹，但不被训练",
          body: "Executor 使用当前 memory 完成任务，产生 trajectory。轨迹既暴露成功经验，也暴露失败路径，作为 Mem-Optimizer 抽取 insight 的输入。",
          points: ["强 executor 产生更高质量轨迹，论文报告收益更明显。", "UMem 优化的是记忆优化器，不是 executor 主参数。"]
        },
        optimizer: {
          label: "Figure 2 / Mem-Optimizer",
          title: "联合学习抽取和管理",
          body: "Mem-Optimizer 从 trajectory 中生成记忆内容 delta，并选择管理操作。论文强调不能只优化 management，因为 extraction 如果是静态模板，会持续带入低质量噪声。",
          points: ["action 包含抽取出的记忆和管理操作。", "目标是抽 generalizable principle，而不是复制实例细节。"]
        },
        reward: {
          label: "Figure 2 / Marginal Utility Reward",
          title: "奖励来自邻域级边际效用",
          body: "候选更新应用到 memory bank 后，UMem 比较更新前后在语义邻域中的表现变化，形成 marginal utility reward。",
          points: ["奖励包含任务成功收益和效率正则等因素。", "GRPO 对一组 rollout 进行相对优势优化。"]
        },
        evolution: {
          label: "Figure 2 / Online Memory Evolution",
          title: "训练中边学习边改 memory bank",
          body: "UMem 不是离线抽一批记忆后固定不动，而是在训练 rollouts 中持续演化 memory bank，迫使 agent 学会使用一个不断变好的记忆系统。",
          points: ["摘要称连续演化过程中保持 monotonic growth curve。", "这也意味着训练稳定性依赖 reward 和操作模板。"]
        }
      }
    },
    body: `
  <section class="section">
    <h2>1. 设计思路：从“记住样本”到“沉淀可迁移经验”</h2>
    <p class="lead">传统 memory pipeline 往往先检索，再从当前轨迹里抽取一条记忆并塞进库里。UMem 认为这会落入 rote memorization trap：模型保存了实例快捷方式，下一次遇到相似但不相同的问题时反而被误导。</p>
    <div class="wide-figure">
      <img src="../../assets/frameworks/umem-figure1.png" alt="UMem Figure 1: vanilla memory pipeline versus UMEM" />
      <p class="figure-caption">论文 Figure 1：左侧展示 vanilla 方法如何把实例特异答案当成记忆，右侧展示 UMem 用可学习 Mem-Optimizer 联合优化抽取与管理。</p>
    </div>
    <div class="note">UMem 的关键不是让 memory bank 更大，而是让 memory bank 中的条目更像可复用的 insight。它把记忆优化器当成策略模型来训练。</div>
  </section>

  <section class="section">
    <h2>2. 论文原图框架：Figure 2 的训练闭环</h2>
    <div class="figure-layout" data-hotspot-root="framework">
      <div class="figure-shell">
        <div class="figure-stage">
          <div class="figure-canvas">
          <img src="../../assets/frameworks/umem-figure2.png" alt="UMem Figure 2: overview of semantic neighborhood modeling and Mem-Optimizer training" />
          ${hotspotButtons([
            { key: "neighborhood", title: "Semantic Neighborhood", x: 13, y: 17 },
            { key: "bank", title: "Memory Bank", x: 47, y: 10 },
            { key: "executor", title: "Frozen Executor", x: 63, y: 27 },
            { key: "optimizer", title: "Mem-Optimizer", x: 40, y: 52 },
            { key: "reward", title: "Marginal Utility Reward", x: 79, y: 71 },
            { key: "evolution", title: "Online Evolution", x: 94, y: 31 }
          ])}
          </div>
        </div>
        <p class="figure-caption">论文 Figure 2：左侧是 Semantic Neighborhood Modeling，右侧是 Mem-Optimizer 训练、rollout、reward 计算和在线记忆演化。</p>
      </div>
      <aside class="hotspot-panel">
        <p class="label" data-hot-label></p>
        <h3 data-hot-title></h3>
        <p data-hot-body></p>
        <div data-hot-points></div>
      </aside>
    </div>
  </section>

  <section class="section">
    <h2>3. 形式化：冻结执行器，训练记忆优化器</h2>
    <p class="lead">论文把 self-evolving agent 写成两部分：冻结 executor \\(E\\) 负责执行任务，外部 memory bank \\(B\\) 是可演化的非参数状态，Mem-Optimizer \\(\\pi_\\phi\\) 负责从轨迹中提炼并应用记忆更新。</p>
    <div class="formula"><code>tau_q, y_hat_q = E(q, B_topk; Theta_0)</code></div>
    <div class="formula"><code>a_q = (Delta_q, opt_q) ~ pi_phi(. | q, tau_q, y_hat_q),  B_{t+1} = Apply(B_t, a_q)</code></div>
    <div class="grid two">
      <div class="mini-card"><h3>Extraction 不是固定 prompt</h3><p>Delta_q 是被训练出来的记忆内容，目标是从轨迹里蒸馏“可复用原则”。</p></div>
      <div class="mini-card"><h3>Management 不是孤立规则</h3><p>opt_q 决定 ADD/UPDATE 等操作，但它必须与抽取出的内容联合优化。</p></div>
    </div>
  </section>

  <section class="section">
    <h2>4. Algorithm 1：两阶段训练逻辑</h2>
    <div class="steps">
      <div class="step"><b>Offline Semantic Neighborhood Modeling</b><p>对每个 query，从语料 D 中找 N 个最近邻 query，形成 NN(q)。这一步为后续泛化奖励提供评价集合。</p></div>
      <div class="step"><b>Executor rollout</b><p>冻结 executor 使用当前 memory bank 生成轨迹 tau_q 和预测结果。</p></div>
      <div class="step"><b>Mem-Optimizer group sampling</b><p>对同一状态采样 G 个 memory update action，形成 GRPO 所需的候选组。</p></div>
      <div class="step"><b>Neighbor-level utility gain</b><p>把候选 action 应用到 bank 后，计算它对 NN(q) 中每个邻居任务的效用变化，再聚合成奖励。</p></div>
      <div class="step"><b>GRPO update and online evolution</b><p>用组内相对优势更新 Mem-Optimizer，同时让 memory bank 在训练中持续演化。</p></div>
    </div>
    <div class="note good">消融结果支持论文的核心主张：移除 Semantic Neighborhood Modeling 会明显掉分；只优化 management 或只优化 extraction 都不如联合优化。</div>
  </section>

  <section class="section">
    <h2>5. 实验怎么读：UMem 赢在“泛化记忆质量”</h2>
    <div class="table-wrap"><table><thead><tr><th>证据</th><th>论文报告</th><th>含义</th></tr></thead><tbody>
      <tr><td>Figure 1 示例任务</td><td>Multi-turn 从 61.11 到 71.78，gain +10.67；Single-turn 从 40.33 到 46.15，gain +5.82。</td><td>提升来自更好的记忆演化，而不是 executor 参数变化。</td></tr>
      <tr><td>五个 benchmark</td><td>AIME、GPQA Diamond、HLE、HotpotQA、ALFWorld。</td><td>论文覆盖推理、问答和交互环境，意图证明不是单一 QA 模板。</td></tr>
      <tr><td>Table 1</td><td>论文称 UMEM 在大多数设置上超过 ReMem、Memp 等基线；UMEM-Qwen3-4B + GPT-5.1 在 ALFWorld 达到 82.84% success rate。</td><td>强 executor 提供更高质量轨迹，Mem-Optimizer 更容易抽到有效 insight。</td></tr>
      <tr><td>Table 2</td><td>N=3 的语义邻域大小表现最好；N=1 和 N=5 都下降。</td><td>邻域奖励必须在“足够相似”和“足够多样”之间平衡。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>6. 工程启发与边界</h2>
    <div class="grid two">
      <div class="mini-card"><h3>适用</h3><p>需要从反复交互中沉淀策略、经验和解题原则的 agent，比如数学推理、网页/环境交互和长期任务助手。</p></div>
      <div class="mini-card"><h3>边界</h3><p>论文没有声称已经提供生产级用户记忆治理，也没有把代码/模型“将公开”写成“已经开源”。</p></div>
    </div>
    <div class="note warn">UMem 依赖高质量 query corpus 和 executor trajectory。若轨迹本身低质，或语义邻域构造偏离真实未来任务，Mem-Optimizer 可能学到错误泛化。</div>
  </section>`,
    sourceNote: `<p class="source-note">本页依据 arXiv:2602.10652 整理。代码与模型状态按论文原文表述为 will be publicly released，未写成已发布事实。</p>`
  },

  {
    id: "memory-r1",
    title: "Memory-R1 深度解读：RL for Memory Management",
    h1: "Memory-R1 深度解读",
    eyebrow: "RL MEMORY MANAGER",
    accent: "#dc2626",
    accent2: "#2563eb",
    sources: [
      { label: "arXiv", href: "https://arxiv.org/abs/2508.19828" },
      { label: "PDF", href: "https://arxiv.org/pdf/2508.19828" },
      { label: "GitHub", href: "https://github.com/yansikuan/Memory-R1" }
    ],
    badges: ["Memory Manager", "Answer Agent", "ADD/UPDATE/DELETE/NOOP", "PPO/GRPO", "152 QA pairs"],
    subtitle: "Memory-R1 把外部记忆系统拆成两个可训练 agent：Memory Manager 学习维护 memory bank，Answer Agent 学习从检索记忆中蒸馏真正有用的证据。它的目标是用 outcome-driven RL 替代静态启发式记忆规则。",
    hotspots: {
      framework: {
        dialogue: {
          label: "Figure 2 / Dialogues",
          title: "多会话对话产生记忆冲突",
          body: "长期对话中，新事实可能是补充、更新或纠错。静态 prompt 容易把补充误判成矛盾，造成 DELETE+ADD 或碎片化。",
          points: ["论文 Figure 1 用领养两只狗的例子说明 vanilla manager 的误删问题。", "Memory Manager 的输入来自当前 turn 和已有 memory bank。"]
        },
        extraction: {
          label: "Figure 2 / Info Extraction",
          title: "先抽取新信息，再检索旧记忆",
          body: "Stage 1 先从 dialogue turn 中抽取候选信息，再搜索 memory bank 中可能相关的旧条目，为结构化操作提供上下文。",
          points: ["数据构造中使用 temporal memory bank。", "Appendix Algorithm 1 描述了训练 tuple 的构建过程。"]
        },
        manager: {
          label: "Figure 2 / Memory Manager",
          title: "四种最小操作：ADD / UPDATE / DELETE / NOOP",
          body: "Manager 是一个策略模型，输入新信息 x 和旧 memory，输出操作 o 以及新内容 m'。这让记忆管理从规则判断变成可优化策略。",
          points: ["PPO 和 GRPO 都被实验。", "奖励来自更新后的 bank 是否帮助下游 QA。"]
        },
        bank: {
          label: "Figure 2 / Memory bank",
          title: "Memory bank 是被 RL 维护的外部状态",
          body: "memory bank 本身不是智能模块，质量取决于 Manager 如何增删改。好的 bank 需要少污染、少重复、保留最新事实。",
          points: ["UPDATE 比 DELETE+ADD 更能保持事实连续性。", "NOOP 让模型学会不把每句话都写入记忆。"]
        },
        retrieve: {
          label: "Figure 2 / Retrieve memory",
          title: "检索只是第一步，不能直接相信",
          body: "Stage 2 从 bank 检索候选记忆，但检索结果可能有噪声。Memory-R1 不把所有检索条目直接塞给生成器。",
          points: ["论文中 Answer Agent 训练时使用 60 条 candidate memories。", "这对应真实 RAG 系统里常见的“召回多、相关少”问题。"]
        },
        answer: {
          label: "Figure 2 / Answer Agent",
          title: "Answer Agent 学会 memory distillation",
          body: "Answer Agent 在生成前执行 Memory Distillation，筛出真正相关的记忆，再进行回答。它与 Manager 分开训练，解决“用什么记忆”的问题。",
          points: ["Answer Agent 的 reward 直接绑定 exact match。", "论文报告相比 reranker-based pipeline 有更好的准确率-延迟权衡。"]
        }
      }
    },
    body: `
  <section class="section">
    <h2>1. 设计思路：让记忆系统的“写”和“用”都可学习</h2>
    <p class="lead">Memory-R1 指出，外部记忆系统里的两个关键决策经常被 prompt 规则硬编码：新信息怎么写进库，以及回答时用哪几条检索记忆。论文把这两个决策分别交给 Memory Manager 和 Answer Agent，并用 RL 根据下游 QA 结果训练。</p>
    <div class="grid three">
      <div class="mini-card"><span class="kpi">4</span><h3>管理动作</h3><p>ADD、UPDATE、DELETE、NOOP 覆盖最常见的记忆生命周期。</p></div>
      <div class="mini-card"><span class="kpi">2</span><h3>可训练 agent</h3><p>Manager 管库，Answer Agent 使用库，避免一个模型同时承担所有职责。</p></div>
      <div class="mini-card"><span class="kpi">152</span><h3>训练 QA pairs</h3><p>论文称使用 152 个 QA pairs 即可带来跨 benchmark 的泛化收益。</p></div>
    </div>
  </section>

  <section class="section">
    <h2>2. 论文原图框架：Figure 2 的双阶段系统</h2>
    <div class="figure-layout" data-hotspot-root="framework">
      <div class="figure-shell">
        <div class="figure-stage">
          <div class="figure-canvas">
          <img src="../../assets/frameworks/memory-r1-figure2.png" alt="Memory-R1 Figure 2: two-stage framework" />
          ${hotspotButtons([
            { key: "dialogue", title: "Dialogues", x: 5, y: 35 },
            { key: "extraction", title: "Info Extraction", x: 23, y: 36 },
            { key: "manager", title: "Memory Manager", x: 62, y: 29 },
            { key: "bank", title: "Memory bank constructed", x: 88, y: 36 },
            { key: "retrieve", title: "Retrieve Memory", x: 20, y: 78 },
            { key: "answer", title: "Answer Agent", x: 67, y: 77 }
          ])}
          </div>
        </div>
        <p class="figure-caption">论文 Figure 2：Stage 1 用 RL-fine-tuned Memory Manager 构造和更新 memory bank；Stage 2 用 Answer Agent 从检索记忆中蒸馏相关证据并回答。</p>
      </div>
      <aside class="hotspot-panel">
        <p class="label" data-hot-label></p>
        <h3 data-hot-title></h3>
        <p data-hot-body></p>
        <div data-hot-points></div>
      </aside>
    </div>
  </section>

  <section class="section">
    <h2>3. Memory Manager：把 CRUD 变成策略学习</h2>
    <p class="lead">Manager 的状态可以理解为 \\(s=(x, M_{old})\\)：当前抽取的新信息 x 和旧 memory bank。策略输出操作 \\(o\\) 和更新内容 \\(m'\\)。</p>
    <div class="formula"><code>(o, m') ~ pi_theta(. | x, M_old)</code></div>
    <div class="table-wrap"><table><thead><tr><th>操作</th><th>语义</th><th>典型风险</th></tr></thead><tbody>
      <tr><td>ADD</td><td>新事实或新偏好进入 memory bank。</td><td>过度 ADD 会造成冗余和噪声污染。</td></tr>
      <tr><td>UPDATE</td><td>把补充信息合并到已有记忆。</td><td>如果合并错对象，会覆盖正确旧事实。</td></tr>
      <tr><td>DELETE</td><td>删除过期或错误记忆。</td><td>静态规则容易把补充事实误删。</td></tr>
      <tr><td>NOOP</td><td>当前信息不值得改变记忆。</td><td>太保守会漏掉长期有用事实。</td></tr>
    </tbody></table></div>
    <div class="note">Manager 的 reward 不是“操作看起来合理”，而是更新后的 memory bank 是否让下游 Answer Agent 答对问题。这是 outcome-driven 的核心。</div>
  </section>

  <section class="section">
    <h2>4. Answer Agent：检索之后还要蒸馏</h2>
    <div class="steps">
      <div class="step"><b>RAG 召回候选</b><p>对每个问题，从 temporal memory bank 中召回一组候选记忆。论文描述 Answer Agent 数据构造时使用 60 条 candidate memories。</p></div>
      <div class="step"><b>Memory Distillation</b><p>Answer Agent 不直接使用所有候选，而是学习挑出与当前问题真正相关的条目。</p></div>
      <div class="step"><b>Exact-match reward</b><p>生成答案与 gold answer 的 EM 作为 reward，使“用什么记忆”由最终回答正确性塑造。</p></div>
      <div class="step"><b>Latency-accuracy tradeoff</b><p>论文比较 Base、Base+Reranker 与 Memory-R1，指出 Answer Agent 在准确率和延迟之间更有优势。</p></div>
    </div>
  </section>

  <section class="section">
    <h2>5. 实验怎么读：RL 超过静态记忆规则</h2>
    <div class="table-wrap"><table><thead><tr><th>结果</th><th>论文报告</th><th>含义</th></tr></thead><tbody>
      <tr><td>LoCoMo / LLaMA</td><td>Memory-R1-GRPO Overall F1 / B1 / J = 45.02 / 37.51 / 62.74。</td><td>相比 RAG、A-Mem、Mem0、MemoryOS、Memory-SFT 等基线，RL 策略带来明显收益。</td></tr>
      <tr><td>LoCoMo / Qwen</td><td>Memory-R1-GRPO Overall F1 / B1 / J = 43.14 / 36.44 / 61.51。</td><td>不同 backbone 下仍成立，说明不是单一模型偶然结果。</td></tr>
      <tr><td>训练规模</td><td>摘要称只用 152 question-answer pairs。</td><td>论文强调小量任务反馈即可塑造记忆操作策略，但这不等于任意新领域都只需 152 条。</td></tr>
      <tr><td>泛化</td><td>论文称在 LoCoMo fine-tune 后 zero-shot 到 MSC 和 LongMemEval 仍有持续改进。</td><td>学到的是操作和蒸馏策略，而不只是 LoCoMo 模板。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>6. 工程启发与边界</h2>
    <div class="grid two">
      <div class="mini-card"><h3>适用</h3><p>已有外部 memory bank，但更新规则和检索使用策略不稳定的对话 agent、个人助理或长期任务系统。</p></div>
      <div class="mini-card"><h3>边界</h3><p>论文没有解决用户可见编辑、回滚、敏感记忆审批、跨设备身份一致性等产品层问题。</p></div>
    </div>
    <div class="note warn">Memory-R1 的 reward 主要来自 QA 正确性。陪伴场景里“是否答得好”通常更主观，需要额外的偏好、隐私和安全奖励设计。</div>
  </section>`,
    sourceNote: `<p class="source-note">本页依据 arXiv:2508.19828 与可访问 GitHub 仓库整理。用户此前提供的 zhiyuanhubj/Memory-R1 链接不可访问，本页继续使用论文关联且可访问的 yansikuan/Memory-R1 仓库。</p>`
  },

  {
    id: "memfactory",
    title: "MemFactory 深度解读：Unified Memory-RL Framework",
    h1: "MemFactory 深度解读",
    eyebrow: "MEMORY-RL INFRASTRUCTURE",
    accent: "#7c3aed",
    accent2: "#0f766e",
    sources: [
      { label: "arXiv", href: "https://arxiv.org/abs/2603.29493" },
      { label: "PDF", href: "https://arxiv.org/pdf/2603.29493" },
      { label: "GitHub", href: "https://github.com/MemTensor/MemFactory" }
    ],
    badges: ["Module layer", "Agent layer", "Environment layer", "Trainer layer", "GRPO"],
    subtitle: "MemFactory 不是新的记忆算法，而是把 Memory-RL 研究中分散的 extraction、updating、retrieval、agent rollout、environment reward 和 trainer 统一成可插拔训练/推理框架。",
    hotspots: {
      framework: {
        trainer: {
          label: "Figure 1 / Trainer Layer",
          title: "Trainer Layer：GRPO 优化记忆策略",
          body: "Trainer Layer 包含配置、优势计算、KL penalty、policy update 和状态监控。它把 environment 的 reward 转成模型权重更新。",
          points: ["论文强调 GRPO 的内存效率降低 Memory-RL 训练门槛。", "Trainer 优化的是 agent 内部 memory management policy。"]
        },
        agent: {
          label: "Figure 1 / Agent Layer",
          title: "Agent Layer：把模块组合成完整记忆代理",
          body: "Agent Layer 是策略执行者，负责组织模块并产生 rollout。Memory-R1、RMM、MemAgent 风格系统可以在这一层组合出来。",
          points: ["同一框架支持 training 和 pure inference。", "agent 不只是调用工具，而是承载 Memory-RL 的行为轨迹。"]
        },
        module: {
          label: "Figure 1 / Module Layer",
          title: "Module Layer：记忆生命周期原子操作",
          body: "Module Layer 把 extractor、updater、retriever 和 agent module 标准化。不同论文的方法可以映射到不同模块实现。",
          points: ["Memory-R1 对应 updater/manager。", "RMM 对应 rerank retriever。", "MemAgent 对应 recurrent memory agent module。"]
        },
        environment: {
          label: "Figure 1 / Environment Layer",
          title: "Environment Layer：数据与 reward",
          body: "Environment 同时是 dataloader 和 reward manager，把原始任务数据转成统一状态，并提供 format reward、LLM-as-a-Judge 等多维奖励。",
          points: ["这层让不同任务可以共享训练接口。", "reward 质量决定 Memory-RL 是否学到正确策略。"]
        },
        models: {
          label: "Figure 1 / Pre-trained models",
          title: "预训练模型被加载进 agent",
          body: "MemFactory 不替代基础模型，而是在 agent 内加载预训练模型，并通过 Trainer 对其内部策略进行优化。",
          points: ["论文实证使用 Qwen3 系列。", "框架也支持 API/inference model 作为不可训练调用。"]
        },
        data: {
          label: "Figure 1 / Task & Memory Datasets",
          title: "任务数据与记忆数据是环境入口",
          body: "Task & Memory Datasets 进入 Data Loader，形成 batch data，再供 agent rollout 和 reward 计算使用。",
          points: ["论文实证复用了公开 MemAgent 架构和训练/评测数据。", "这说明 MemFactory 更偏复现和比较基础设施。"]
        }
      }
    },
    body: `
  <section class="section">
    <h2>1. 设计思路：为 Memory-RL 建一套“实验操作系统”</h2>
    <p class="lead">Memory-R1、RMM、MemAgent 都证明了 RL 可以优化记忆行为，但每篇论文都有自己的数据格式、rollout、reward 和训练脚本。MemFactory 的贡献是把这些共性抽成统一框架，降低复现和组合成本。</p>
    <div class="note">把 MemFactory 理解成“LLaMA-Factory 之于微调”的 Memory-RL 版本最贴切：它的重点是模块化基础设施，而不是提出新的 memory policy。</div>
  </section>

  <section class="section">
    <h2>2. 论文原图框架：Figure 1 的四层架构</h2>
    <div class="figure-layout" data-hotspot-root="framework">
      <div class="figure-shell">
        <div class="figure-stage">
          <div class="figure-canvas">
          <img src="../../assets/frameworks/memfactory-figure1.png" alt="MemFactory Figure 1: overall architecture" />
          ${hotspotButtons([
            { key: "trainer", title: "Trainer Layer", x: 53, y: 9 },
            { key: "agent", title: "Agent Layer", x: 29, y: 43 },
            { key: "module", title: "Module Layer", x: 28, y: 60 },
            { key: "environment", title: "Environment Layer", x: 78, y: 48 },
            { key: "models", title: "Pre-trained Models", x: 31, y: 90 },
            { key: "data", title: "Task and Memory Datasets", x: 78, y: 90 }
          ])}
          </div>
        </div>
        <p class="figure-caption">论文 Figure 1：MemFactory 的 Module、Agent、Environment、Trainer 四层及其数据、reward、权重更新关系。</p>
      </div>
      <aside class="hotspot-panel">
        <p class="label" data-hot-label></p>
        <h3 data-hot-title></h3>
        <p data-hot-body></p>
        <div data-hot-points></div>
      </aside>
    </div>
  </section>

  <section class="section">
    <h2>3. Module Layer：统一 generate / rollout / inference</h2>
    <p class="lead">论文 Table 1 把模块接口标准化。这个设计让不同 memory 方法可以共享训练框架，同时保持训练和推理语义清晰。</p>
    <div class="table-wrap"><table><thead><tr><th>接口</th><th>模型</th><th>Reward</th><th>作用</th></tr></thead><tbody>
      <tr><td><code>generate</code></td><td>Training Model</td><td>Deferred</td><td>产生中间状态，奖励等完整交互或轨迹结束后再分配。</td></tr>
      <tr><td><code>rollout</code></td><td>Training Model</td><td>Final reward</td><td>产生完整轨迹，接受最终任务级奖励。</td></tr>
      <tr><td><code>inference</code></td><td>Inference Model / APIs</td><td>None</td><td>只推理，不参与训练。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>4. 它如何容纳三类 Memory-RL 论文</h2>
    <div class="grid three">
      <div class="mini-card"><h3>Memory-R1</h3><p>结构化 ADD/UPDATE/DELETE/NOOP 更像 updater/manager module，environment 用 QA 正确性给 reward。</p></div>
      <div class="mini-card"><h3>RMM</h3><p>Retrospective Reflection 对应 rerank retriever，LLM citation signal 可以作为 reward 更新 reranker。</p></div>
      <div class="mini-card"><h3>MemAgent</h3><p>流式 overwrite memory 对应 agent module 或 recurrent memory module，rollout 跨多个 chunk。</p></div>
    </div>
    <div class="note good">这也是 MemFactory 的实用价值：它把“不同论文的一次性实现”变成可替换、可训练、可比较的组件。</div>
  </section>

  <section class="section">
    <h2>5. 实验怎么读：框架有效，但不是新 SOTA 算法本身</h2>
    <div class="table-wrap"><table><thead><tr><th>设置</th><th>论文报告</th><th>含义</th></tr></thead><tbody>
      <tr><td>验证对象</td><td>论文使用公开 MemAgent 架构及其训练/评测数据进行实证。</td><td>说明框架可以跑通复杂的 recurrent memory policy，而不只是抽象图。</td></tr>
      <tr><td>Qwen3-1.7B</td><td>平均分相对提升 14.8%，但 OOD benchmark 略降。</td><td>小模型主任务收益明显，迁移稳定性仍有限。</td></tr>
      <tr><td>Qwen3-4B-Instruct</td><td>平均相对提升 7.3%，包括 OOD benchmark 的一致提升。</td><td>更大模型更稳地转移 learned recurrent memory policy。</td></tr>
      <tr><td>硬件</td><td>论文描述可在单张 NVIDIA A800 80GB 上运行相关训练评测。</td><td>框架降低门槛，但仍不是低资源零成本训练。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>6. 工程启发与边界</h2>
    <div class="grid two">
      <div class="mini-card"><h3>适用</h3><p>研究团队要复现、比较、组合多种 Memory-RL 方法，或在同一环境中替换 extractor/updater/retriever。</p></div>
      <div class="mini-card"><h3>边界</h3><p>论文承认当前覆盖的代表范式有限，训练效率仍有改进空间；它也不是用户级记忆产品。</p></div>
    </div>
    <div class="note warn">MemFactory 页面不应把 14.8% 写成所有任务保证。该结果来自论文设置下的平均相对提升，且不同模型/OOD 表现不同。</div>
  </section>`,
    sourceNote: `<p class="source-note">本页依据 arXiv:2603.29493 与可访问 GitHub 仓库整理。计划中提到的 xiaomi-research/memfactory 链接不可访问，本页使用论文 PDF 中给出的 MemTensor/MemFactory。</p>`
  },

  {
    id: "rmm",
    title: "RMM 深度解读：Reflective Memory Management",
    h1: "RMM 深度解读",
    eyebrow: "REFLECTIVE PERSONALIZED MEMORY",
    accent: "#0f766e",
    accent2: "#1d4ed8",
    sources: [
      { label: "ACL Anthology", href: "https://aclanthology.org/2025.acl-long.413/" },
      { label: "arXiv", href: "https://arxiv.org/abs/2503.08026" },
      { label: "PDF", href: "https://arxiv.org/pdf/2503.08026" }
    ],
    badges: ["Prospective Reflection", "Retrospective Reflection", "Citation reward", "Reranker RL", "LongMemEval"],
    subtitle: "RMM 面向长期个性化对话，解决两个具体问题：固定粒度记忆会把对话主题切碎，固定检索又无法根据用户和场景动态调整。它用 Prospective Reflection 组织未来可检索记忆，用 Retrospective Reflection 根据引用证据在线修正检索。",
    hotspots: {
      framework: {
        retrieve: {
          label: "Algorithm 1 / Retrieve",
          title: "先从 memory bank 召回 Top-K",
          body: "给定 query q 和 memory bank B，retriever f_theta 召回 Top-K 候选记忆。这里的 retriever 可以是 Contriever、Stella 或 GTE。",
          points: ["召回阶段追求覆盖。", "后续 reranker 再做精排。"]
        },
        rerank: {
          label: "Algorithm 1 / Rerank",
          title: "Reranker 选 Top-M",
          body: "RMM 不直接 fine-tune retriever，而是用轻量 reranker g_phi 对候选记忆排序，选出 Top-M 给 LLM 使用。",
          points: ["Table 2 显示 RR without reranker 会严重掉分。", "reranker 是 Retrospective Reflection 的可学习部件。"]
        },
        generate: {
          label: "Algorithm 1 / Generate",
          title: "LLM 同时生成回答和 citation scores",
          body: "LLM 输入 query、当前 session 和 Top-M memories，输出 response a，同时给每条 memory 生成是否被引用的信号 R_M。",
          points: ["citation 不是事后人工标注。", "论文认为 response-conditioned citations 比 prior/post-hoc 更有效。"]
        },
        rl: {
          label: "Algorithm 1 / RL_Update",
          title: "引用信号变成在线 RL reward",
          body: "被回答引用的 memory 得到 +1 useful reward，未引用得到 -1 not useful reward，用 REINFORCE 更新 reranker。",
          points: ["这就是 Retrospective Reflection。", "它让系统根据真实生成过程反思“刚才哪些检索有用”。"]
        },
        prospective: {
          label: "Algorithm 1 / Prospective",
          title: "会话结束后再组织记忆",
          body: "当 session 结束，RMM 从完整会话 S 中抽取 topic-based memories，并与 memory bank 中相近主题合并或新增。",
          points: ["这就是 Prospective Reflection。", "它面向未来检索优化粒度，而不是简单按 turn 或 session 切块。"]
        }
      }
    },
    body: `
  <section class="section">
    <h2>1. 设计思路：长期对话记忆不是“越多越好”</h2>
    <p class="lead">RMM 针对 personalized dialogue agent。论文认为长期记忆的两个主要障碍是：一，固定粒度的摘要会让同一主题被拆散或重复；二，固定检索机制无法适配不同用户、不同对话阶段和不同任务。</p>
    <div class="grid two">
      <div class="mini-card"><h3>Prospective Reflection</h3><p>面向未来：会话结束后，把历史对话按 topic 组织成可检索的 memory entries，并决定 merge 或 add。</p></div>
      <div class="mini-card"><h3>Retrospective Reflection</h3><p>回看刚才：根据 LLM 回答中实际引用了哪些记忆，在线更新 reranker。</p></div>
    </div>
  </section>

  <section class="section">
    <h2>2. 论文原始框架：Algorithm 1 串起 PR 与 RR</h2>
    <div class="figure-layout" data-hotspot-root="framework">
      <div class="figure-shell">
        <div class="figure-stage">
          <div class="figure-canvas">
          <img src="../../assets/frameworks/rmm-algorithm1.png" alt="RMM Algorithm 1: Reflective Memory Management for dialogue agents" />
          ${hotspotButtons([
            { key: "retrieve", title: "Retrieve", x: 22, y: 26 },
            { key: "rerank", title: "Rerank", x: 21, y: 33 },
            { key: "generate", title: "Generate", x: 21, y: 46 },
            { key: "rl", title: "RL update", x: 24, y: 56 },
            { key: "prospective", title: "Prospective Reflection", x: 25, y: 76 }
          ])}
          </div>
        </div>
        <p class="figure-caption">论文 Algorithm 1：RMM 每轮先 retrieve/rerank/generate，再用 citation reward 更新 reranker；session 结束时抽取并更新 topic-based memory bank。</p>
      </div>
      <aside class="hotspot-panel">
        <p class="label" data-hot-label></p>
        <h3 data-hot-title></h3>
        <p data-hot-body></p>
        <div data-hot-points></div>
      </aside>
    </div>
  </section>

  <section class="section">
    <h2>3. Prospective Reflection：把会话整理成未来可检索的 topic memory</h2>
    <p class="lead">Prospective Reflection 发生在 session 结束后。LLM 从会话中抽取 topic summary 与 raw dialogue，并与当前 memory bank 中相近主题比较：相关则 merge，不相关则 add。</p>
    <div class="wide-figure">
      <img src="../../assets/frameworks/rmm-figure2.png" alt="RMM Figure 2: Prospective Reflection" />
      <p class="figure-caption">论文 Figure 2：会话被 decomposed & summarized；新 memory 与现有 memory bank 对比，相关条目 merge，新主题 add。</p>
    </div>
    <div class="note">这一步解决的不是“回答时如何检索”，而是“未来要检索时，记忆应该以什么粒度存在”。topic summary 作为检索 key，raw dialogue 保留原始证据。</div>
  </section>

  <section class="section">
    <h2>4. Retrospective Reflection：用引用证据训练 reranker</h2>
    <p class="lead">Retrospective Reflection 发生在回答时。Retriever 先召回 Top-K，reranker 选择 Top-M，LLM 生成回答并标注每条 memory 是否被引用。这个 citation signal 被转成 binary reward 更新 reranker。</p>
    <div class="wide-figure">
      <img src="../../assets/frameworks/rmm-figure3.png" alt="RMM Figure 3: Retrospective Reflection" />
      <p class="figure-caption">论文 Figure 3：Memory Bank → Retriever → Top-K → Reranker → Top-M → LLM Response；citation scores 作为 RL reward 反向更新 reranker。</p>
    </div>
    <div class="formula"><code>Delta phi = eta * (R - b) * grad_phi log P(M_M | q, M_K; phi)</code></div>
    <div class="note good">RMM 的“反思”不是单纯生成总结，而是把回答中实际使用的证据转成检索排序的训练信号。</div>
  </section>

  <section class="section">
    <h2>5. 实验怎么读：结构化记忆 + 自适应检索</h2>
    <div class="table-wrap"><table><thead><tr><th>证据</th><th>论文报告</th><th>含义</th></tr></thead><tbody>
      <tr><td>Table 1 / RMM + GTE</td><td>MSC METEOR / BERTScore = 33.4 / 57.1；LongMemEval Recall@5 / Accuracy = 69.8 / 70.4。</td><td>强 retriever 加上 RMM 的结构化记忆与 rerank 反馈，取得整体最佳。</td></tr>
      <tr><td>Table 1 / RAG + GTE</td><td>MSC 27.5 / 52.1；LongMemEval 62.4 / 63.6。</td><td>普通 RAG 有效，但固定检索仍低于 RMM。</td></tr>
      <tr><td>Table 2 / Ablation</td><td>Contriever 下 RAG 24.8/58.8；+PR 28.6/59.6；+RR 27.5/60.2；完整 RMM 30.8/61.2。</td><td>PR 和 RR 都有贡献，完整系统最好。</td></tr>
      <tr><td>Table 3 / Citation scores</td><td>LongMemEval 上 useful-memory F1 为 90.2，overall F1 为 86.7。</td><td>引用信号作为 reward 有一定可靠性，但仍是 LLM 生成信号。</td></tr>
    </tbody></table></div>
  </section>

  <section class="section">
    <h2>6. 工程启发与边界</h2>
    <div class="grid two">
      <div class="mini-card"><h3>适合</h3><p>长期个性化对话、陪伴型 agent、跨会话偏好/经历/健康信息回忆等需要证据连续性的场景。</p></div>
      <div class="mini-card"><h3>边界</h3><p>论文主要处理文本记忆；limitations 中也提到 RL 更新成本、多模态适用性和动态 memory update 仍需优化。</p></div>
    </div>
    <div class="note warn">真实产品里必须额外处理隐私：RMM 依赖历史对话和 citation feedback，可能把敏感历史带入检索或回答，需要权限、删除和审计。</div>
  </section>`,
    sourceNote: `<p class="source-note">本页依据 ACL Anthology 2025.acl-long.413 与 arXiv:2503.08026 整理。实验数字取自论文 Table 1、Table 2、Table 3；对 citation reward 的可靠性按论文验证边界陈述。</p>`
  }
];

for (const page of pages) {
  const dir = path.join(root, "papers", page.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), pageTemplate(page), "utf8");
  console.log(`wrote papers/${page.id}/index.html`);
}
