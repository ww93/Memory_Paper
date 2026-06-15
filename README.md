# Memory Paper

论文解读与交互式演示集合。使用 GitHub Pages 发布多篇论文的 HTML 展示。

## 📁 仓库结构

```
Memory_Paper/
├── index.html              # 主索引页面（访问 username.github.io/Memory_Paper）
├── papers/                 # 论文存储目录
│   ├── msa/
│   │   └── index.html      # MSA 论文详细解读
│   ├── paper2/
│   │   └── index.html      # 后续论文...
│   └── ...
└── README.md               # 本文件
```

## 🚀 快速开始

### 查看论文
- **主页**：访问 `https://[username].github.io/Memory_Paper`
- **单篇论文**：访问 `https://[username].github.io/Memory_Paper/papers/[paper-id]/`
  - 例如：`https://[username].github.io/Memory_Paper/papers/msa/`

### 添加新论文

1. **创建新目录**
   ```bash
   mkdir papers/[new-paper-id]
   ```

2. **准备 HTML 文件**
   - 将论文的 HTML 文件存为 `papers/[new-paper-id]/index.html`
   - 确保 HTML 文件包含 `<!DOCTYPE html>` 和必要的 `<head>` 标签

3. **更新主索引**
   - 打开 `index.html`
   - 在 `papers` 数组中添加新论文信息：
   ```javascript
   {
     id: 'paper-id',
     title: '论文标题',
     subtitle: '副标题',
     description: '论文简介...',
     tags: ['标签1', '标签2'],
     href: './papers/paper-id/'
   }
   ```

4. **提交并推送**
   ```bash
   git add papers/[new-paper-id]/index.html index.html
   git commit -m "Add: 新论文解读"
   git push origin main
   ```

5. **等待发布**
   - GitHub Pages 会自动更新（通常 1-2 分钟）
   - 新论文即可通过链接访问

## ⚙️ GitHub Pages 配置

### 仓库设置
该仓库已配置好 GitHub Pages，**无需额外设置**。只需确保：

1. **仓库是公开的**（Public）
2. **仓库名为** `Memory_Paper`
3. **已启用 GitHub Pages**：
   - 进入仓库 → Settings → Pages
   - Source 设置为 "Deploy from a branch"
   - Branch 选择 `main` 和 `/ (root)`
   - 点击 Save

### 访问地址
- 主索引：`https://[username].github.io/Memory_Paper/`
- 论文页面：`https://[username].github.io/Memory_Paper/papers/[paper-id]/`

> 如果仓库名不同，则需更新链接中的路径。

## 📝 论文页面规范

为确保论文能正常展示，每个 `papers/[paper-id]/index.html` 需要包括：

- ✅ 完整的 HTML 文档结构（DOCTYPE、html、head、body 标签）
- ✅ 适当的字符编码声明（`<meta charset="utf-8">`）
- ✅ 视口设置（`<meta name="viewport">`）
- ✅ 自包含的样式和脚本（避免外部依赖本地路径）
- ✅ 使用 CDN 资源（如 MathJax、图表库等）

示例 head 标签：
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>论文标题</title>
  <style>/* 内联样式或链接 CDN */</style>
  <script src="https://cdn.jsdelivr.net/..."></script>
</head>
```

## 🔗 相对路径处理

- ✅ 各论文页面完全独立，相对路径只需在 `papers/[id]/` 内部考虑
- ✅ 返回主页可用：`<a href="../../">返回主页</a>`
- ✅ 外部资源使用绝对 CDN URL（如 MathJax、Bootstrap 等）
- ⚠️ 避免绝对路径或相对于根目录的引用

## 📊 当前收录

| 论文 | 主题 | 标签 |
|------|------|------|
| MSA | Memory Sparse Attention | RAG, 长上下文, 记忆系统 |

## 💡 后续扩展

- [ ] 为每篇论文添加元数据（作者、出版年份、论文链接）
- [ ] 支持论文全文搜索
- [ ] 添加论文评分和讨论区
- [ ] 集成 GitHub Issues 作为论文讨论平台

## 📖 参考资源

- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [GitHub Pages 故障排除](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/troubleshooting-jekyll-build-errors-for-github-pages)

---

**维护者**：[Your Name]  
**最后更新**：2026-06-15
