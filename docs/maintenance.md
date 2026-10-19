# 文档维护指南

本页说明 IoT Deck 文档站（VitePress）的目录约定、写作模板、链接规范、构建与部署流程，供后续维护者直接照做。

## 一、站点总览

- **文档框架**：VitePress 1.6（Vue 3 驱动的静态站点生成器）
- **文档根目录**：仓库的 `docs/`（同时也是站点根）
- **配置入口**：`docs/.vitepress/config.ts`（导航、侧边栏、搜索、SEO、主题）
- **自定义主题**：`docs/.vitepress/theme/`（`index.ts` 注册、`custom.css` 品牌样式、`VersionBadge.vue` 版本徽标）
- **静态资源**：`docs/public/`（构建时原样拷贝到站点根，如 `logo.svg`、`hero.svg`）
- **构建产物**：`docs/.vitepress/dist/`（可直接托管到任意静态站点服务）
- **线上地址**：<https://yzhijie.github.io/iot-tutorial/>

站点路由与文件路径一一对应（开启 `cleanUrls`，`.md` 后缀不会出现在 URL 中）：

| 文件 | 页面路由 |
| --- | --- |
| `docs/index.md` | `/`（站点首页） |
| `docs/part1-fundamentals/1.1-iot-architecture.md` | `/part1-fundamentals/1.1-iot-architecture` |
| `docs/part3-practice/3.3-realtime-data.md` | `/part3-practice/3.3-realtime-data` |
| `docs/maintenance.md` | `/maintenance`（本页） |

四大模块的目录划分：

```text
docs/
├── index.md                     首页（Hero + 目录 + 快速开始 + FAQ）
├── maintenance.md               本页：文档维护指南
├── part1-fundamentals/          第一篇 · 基础概念篇（1.1 ~ 1.3）
├── part2-stack/                 第二篇 · 技术栈篇（2.1 ~ 2.4）
├── part3-practice/              第三篇 · 项目实战篇（3.1 ~ 3.6）
├── part4-production/            第四篇 · 进阶优化篇（4.1 ~ 4.4）
├── public/                      站点静态资源（logo.svg / hero.svg）
└── .vitepress/
    ├── config.ts                站点配置
    ├── theme/                   主题定制
    └── dist/                    构建产物（不入库）
```

## 二、本地开发与构建

```bash
# 安装依赖（仓库根目录；文档站与 demo 各自独立）
pnpm install

pnpm docs:dev       # 启动本地开发服务（默认 http://localhost:5173，热更新）
pnpm docs:build     # 构建静态产物到 docs/.vitepress/dist
pnpm docs:preview   # 预览构建产物（用于上线前验收）
```

> 文档站依赖在**仓库根目录**，配套示例项目 `demo/` 有自己的 `package.json`，两者互不影响。

## 三、新增或修改一篇教程

### 1. 文件放置

按模块放入对应目录，文件名用 `章号-英文短横线标题.md`，例如第三篇新增一章 → `docs/part3-practice/3.7-xxx.md`。

### 2. 章首信息块（固定五件套）

每章开头必须有这段 blockquote，缺一项即视为未完成：

```markdown
# 第 X.Y 章 章节标题

> - **前置知识**：第 X.Z 章（相关概念）
> - **预计学习时长**：约 NN 分钟
> - **配套代码**：
>   - [demo/src/xxx.ts](https://github.com/YZhiJie/iot-tutorial-project/blob/main/demo/src/xxx.ts)（一句话说明）
> - **本章实操任务**：一句话描述要动手做什么
```

### 3. 章末结构

结尾必须包含四段（顺序固定，便于横向对照）：

```markdown
## 运行与验证        ← 启动命令 + 预期现象
## 最佳实践与常见坑   ← 逐条「现象 → 原因 → 解法」
## 实操任务          ← 与章首「本章实操任务」呼应
## 验收标准          ← - [ ] 清单，逐条可勾选
```

### 4. 注册导航与侧边栏

新增章节后必须同步 `docs/.vitepress/config.ts`：

- `themeConfig.sidebar`：在对应模块分组下追加 `{ text: "X.Y 标题", link: "/模块目录/X.Y-文件" }`（**link 不带 `.md`**）；
- `themeConfig.nav`：仅当新增的是「模块级入口页」时才需要调整。

遗漏注册的后果：页面能构建出来，但侧边栏找不到入口。

### 5. 标题层级

- `#` 一级标题仅出现一次（章标题，会自动成为页内 `<title>` 与 SEO 标题）；
- `##` / `###` 用于正文小节，右侧「本页目录」自动生成（`config.ts` 中 `outline.level = [2, 3]`）。

## 四、链接规范（重要）

| 链接类型 | 写法 | 示例 |
| --- | --- | --- |
| 站内跳转 | 以 `/` 开头的站点路由 | `[第 3.2 章](/part3-practice/3.2-device-list)` |
| 站内锚点 | 路由 + `#` 锚点 | `[#解码容错](/part3-practice/3.3-realtime-data#解码容错层)` |
| 配套源码 | GitHub blob 绝对地址 | `[codec.ts](https://github.com/YZhiJie/iot-tutorial-project/blob/main/demo/src/services/mqtt/codec.ts)` |
| 外部参考 | 完整 `https://` 地址 | 官方文档链接 |

**禁止**使用相对路径引用源码（如 `../../demo/src/...`）：它在文档站里无法解析，会被 VitePress 判定为死链导致构建失败；相邻章节之间也不要写 `../xx.md` 相对链接，统一用站点路由。

**不要在正文里裸露 `http://localhost:5173` 这类地址**：VitePress 会自动把裸 URL 转成链接并纳入死链检查。示例地址请用行内代码包裹，写成 `` `http://localhost:5173` ``。

### 死链检查（构建即门禁）

`pnpm docs:build` 内置死链检查：发现站内死链会**直接让构建失败**。上线前务必保证构建零报错。若确有需要放行的链接，在 `config.ts` 的 `ignoreDeadLinks` 中按规则显式声明，不要全局关闭检查。

## 五、样式与品牌定制

品牌色板与配套 demo 监控台（`demo/src/assets/main.css`）保持一致，统一维护在 `docs/.vitepress/theme/custom.css`：

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--vp-c-brand-1/2/3` | `#38bdf8` 系列 | 链接、按钮、激活态 |
| `--vp-c-bg` / `--vp-c-bg-soft` | `#0b1220` / `#131f33` | 暗色底与面板底 |
| `--vp-c-text-1/2/3` | `#e2e8f0` / `#c3cddb` / `#94a3b8` | 正文 / 次要 / 弱化文本 |
| 语义色 | `#34d399` / `#fbbf24` / `#f87171` | 正常 / 警告 / 错误 |

约定：

- **只改变量**，不改默认主题结构；确需新样式时在 `custom.css` 追加，并在注释里写明动机；
- 站点默认深色（`config.ts` 的 `appearance: "dark"`），同时保留外观切换，浅色模式的主色另有覆盖；
- 正文里的图片统一放 `docs/public/`，正文用 `/xxx.svg` 引用。

## 六、站点功能说明

| 功能 | 实现方式 | 维护注意 |
| --- | --- | --- |
| 全局搜索 | `search.provider: 'local'`（内置 minisearch，构建期生成索引，离线可用） | 新增章节后**重新构建**才会被检索到 |
| 代码块复制 | 默认主题内置 | 无需配置 |
| 版本切换 | 顶栏右侧版本徽标（`theme/VersionBadge.vue`）→ GitHub Releases | 发新版本时改 `VersionBadge.vue` 中的 `VERSION` 常量 |
| 页面导航 | 上一篇/下一篇（`docFooter`）+ 侧边栏 + 右侧页内目录 | 由 sidebar 顺序决定 |
| 移动端 | 默认主题响应式 + 窄屏表格横向滚动（`custom.css`） | 新增大表格时注意列宽 |
| 多语言 | 当前为单语中文站（`lang: 'zh-CN'`） | 若日后需多语言，改用 `locales` 配置并拆分 `themeConfig`，勿手工复制多套 md |
| SEO | `sitemap` + 每页 `lastUpdated` + `meta description` | 站点描述改 `config.ts` 中的 `SITE_DESC` |
| 页面编辑入口 | `editLink` 指向 GitHub 上的 `docs/:path` | 仓库改名时同步更新 |

## 七、构建与部署

### 拓扑（双仓库）

```text
YZhiJie/iot-tutorial-project  （公开源码仓库，本仓库）
        │  push main 触发 GitHub Actions
        ▼
  构建 VitePress → docs/.vitepress/dist
        │  peaceiris/actions-gh-pages 推送产物
        ▼
YZhiJie/iot-tutorial          （公开部署仓库，仅存放 gh-pages 分支产物）
        │  GitHub Pages
        ▼
https://yzhijie.github.io/iot-tutorial/
```

采用双仓拓扑的原因：源码仓库与部署产物解耦，Pages 分支不污染源码历史；同时便于后续把部署仓库接入自定义域名。

### 工作流

`.github/workflows/deploy-pages.yml`：`push main` 或手动 `workflow_dispatch` 触发，安装 pnpm/Node → `pnpm install --frozen-lockfile` → 以 `DEPLOY_BASE=/iot-tutorial/` 构建（注入 Pages 子路径 base）→ 写入 `.nojekyll` → 推送产物到部署仓库 `gh-pages` 分支。

### 首次配置（换账号/重建仓库时）

1. 在部署仓库开启 Pages：**Settings → Pages → Source** 选 `Deploy from a branch`，分支 `gh-pages`、目录 `/ (root)`；
2. 在本仓库添加 Secret `PAGES_TOKEN`：一个对部署仓库有 `contents: write` 权限的 PAT；
3. 若部署目标仓库名变化，同步修改工作流里的 `external_repository` 与 `config.ts` 的 `SITE_URL`、`BASE` 相关默认值。

> 本地构建默认 `base = '/'`（根路径）；只有 CI 构建会注入 `/iot-tutorial/`。因此在本地 `docs:dev` / `docs:preview` 下，链接是根路径格式，与线上不同属正常现象。

### 发布新版本

```bash
# 1. 确认质量门禁
pnpm docs:build          # 必须零报错（含死链检查）

# 2. 同步版本号与文案
#    - docs/.vitepress/theme/VersionBadge.vue 的 VERSION
#    - docs/index.md 的「里程碑」段落

# 3. 提交并推送，等待 Actions 完成
git add -A && git commit -m "docs: 发布 vX.Y"
git push origin main

# 4. 线上验收
#    - 检查 Actions 是否全绿
#    - 打开 https://yzhijie.github.io/iot-tutorial/ 核对首页与改动章节
#    - 在仓库打 tag / 建 Release，作为「版本切换」的落点
```

## 八、常见问题排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 构建报 `dead link` | 正文写了相对路径 / 站内路由拼错 / 章节被删但侧边栏仍引用 | 按报错文件与行号修正；源码链接一律用 GitHub 绝对地址 |
| 侧边栏没有新章节 | 忘了在 `config.ts` 的 `sidebar` 注册 | 追加对应条目（link 不带 `.md`） |
| 搜索结果缺新内容 | 本地搜索索引在构建期生成 | 重新 `pnpm docs:build` 或重启 `docs:dev` |
| 线上样式/资源 404 | 部署 base 与仓库名不一致 | 核对工作流 `DEPLOY_BASE`、`external_repository`、Pages 地址三者一致 |
| 页面渲染异常、出现 `{{ }}` 原文 | 代码块外误写了 Vue 插值语法 | 把示例代码放进代码围栏内（`` ``` ``），或对片段加 `v-pre` |
| 表格在窄屏撑破布局 | 表格列过多 | 已全局启用横向滚动；仍不适配时拆分表格 |
| demo 与文档不同步 | 改代码未同步改文档（或反之） | 源码与章节「配套代码」链接、`运行与验证` 段落一并更新 |

---

维护约定一句话：**改文档 = 改内容 + 改链接 + 改注册 + 跑一遍 `pnpm docs:build`**。
