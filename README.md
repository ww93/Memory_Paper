# Memory Paper

论文解读与交互式演示集合。使用 GitHub Pages 发布多篇论文的 HTML 展示。

## 📁 仓库结构

```
Memory_Paper/
├── index.html                # 主索引页面（论文列表）
├── README.md                 # 本文件
├── .gitignore               # Git 忽略文件
├── msa/                      # 论文预览页面目录
│   └── index.html            # MSA 预览页（简介+主要成果）
└── papers/                   # 论文完整内容目录
    ├── msa/
    │   └── index.html        # MSA 完整解读（详细图表+深度分析）
    ├── paper-2-id/
    │   └── index.html        # 后续论文...
    └── ...
```

## 🌐 访问体系

| 位置 | URL | 说明 |
|------|-----|------|
| **主页** | `/Memory_Paper/` | 论文列表+快速导航 |
| **预览页** | `/Memory_Paper/[paper-id]/` | 论文简介+主要成果（快速浏览）|
| **完整解读** | `/Memory_Paper/papers/[paper-id]/` | 完整论文（详细图表+深度内容）|

**示例**（MSA）：
- 预览：`https://ww93.github.io/Memory_Paper/msa/`
- 完整：`https://ww93.github.io/Memory_Paper/papers/msa/`

## 🚀 快速开始

### 查看论文
- **主页**：`https://ww93.github.io/Memory_Paper`
- **论文预览**：`https://ww93.github.io/Memory_Paper/[paper-id]/`
- **完整解读**：`https://ww93.github.io/Memory_Paper/papers/[paper-id]/`

### 添加新论文

#### 第 1 步：创建目录
```bash
mkdir -p papers/[paper-id]
mkdir [paper-id]
```

#### 第 2 步：创建完整解读页面
在 `papers/[paper-id]/index.html` 放入完整的论文 HTML 文件。

#### 第 3 步：创建预览页面
在 `[paper-id]/index.html` 创建预览页面，包含：
- 论文标题和副标题
- 简介说明
- 关键创新点（bullet list）
- 主要成果（表格或 highlights）
- 一个链接到 `../papers/[paper-id]/` 的"查看完整论文"按钮

**参考** `msa/index.html` **的结构**

#### 第 4 步：更新主索引
编辑 `index.html`，在 `papers` 数组中添加：
```javascript
{
  id: 'bert',
  title: 'BERT',
  subtitle: '...',
  description: '...',
  tags: ['标签1', '标签2'],
  href: './bert/'
}
```

> 注意：`href` 指向**预览页面** `./bert/`

#### 第 5 步：提交
```bash
git add papers/[paper-id]/ [paper-id]/ index.html
git commit -m "Add: 新论文解读"
git push origin main
```

## 🔄 二层结构设计

### 预览页面 (`/[paper-id]/`)
- **内容**：论文简介、关键创新、主要成果
- **用途**：快速了解论文核心内容
- **加载速度**：快

### 完整解读 (`/papers/[paper-id]/`)
- **内容**：详细图表、交互演示、公式推导、实验分析
- **用途**：深度学习和研究参考

### 用户访问流程
1. 主页列表 → 点击论文卡片 → 预览页面
2. 预览页面 → 点击"查看完整论文" → 完整解读

## ⚙️ GitHub Pages 配置

该仓库已配置好 GitHub Pages，**无需额外设置**。

- 主索引：`https://ww93.github.io/Memory_Paper/`
- 预览页面：`https://ww93.github.io/Memory_Paper/[paper-id]/`
- 完整解读：`https://ww93.github.io/Memory_Paper/papers/[paper-id]/`

## 📊 当前收录

| 论文 | 预览 | 完整解读 |
|------|------|---------|
| MSA | `/msa/` | `/papers/msa/` |

---

**维护者**：ww93  
**最后更新**：2026-06-15
