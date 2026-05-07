# Corvusx
![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen) 
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue) 

一个基于 [fuwari](https://astro.build/) 开发带管理后台的博客。


## 👀 依赖需求

- Node.js >= 22
- pnpm >= 9


## 🚀本地开发
创建本地博客仓库：
```sh
git clone https://github.com/ishxw/corvusx.git
cd corvusx
pnpm install
pnpm dev
```
发布场景：
```sh
pnpm build
pnpm preview
```

默认地址是 `http://localhost:3033/`。
```sh
博客后台管理面板：
   * 用户名：admin
   * 默认密码：admin123456
```

1. 通过后台管理面板或本地配置文件(`src/config.ts`)自定义博客
2. 执行 `pnpm new-post <filename>` 创建新文章，并在 `src/content/posts/` 目录中编辑（可通过后台管理面板创建/编辑文章）

## 🧩 Markdown 扩展语法

除了 Astro 默认支持的 [GitHub 风格 Markdown](https://github.github.com/gfm/) 之外，还额外提供了以下增强功能：
* 提示块（[预览与用法](https://fuwari.vercel.app/posts/markdown-extended/#admonitions)）
* GitHub 仓库卡片（[预览与用法](https://fuwari.vercel.app/posts/markdown-extended/#github-repository-cards)）
* 使用 Expressive Code 的增强代码块（[预览](https://fuwari.vercel.app/posts/expressive-code/) / [文档](https://expressive-code.com/)）

## 常用命令

| Command | Action |
|:--|:--|
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 本地预览构建结果 |
| `pnpm check` | 运行 Astro 类型与内容检查 |
| `pnpm format` | 格式化 `src/` 下的代码 |
| `pnpm lint` | 运行 Biome 检查并自动修复 |
| `pnpm new-post <filename>` | 新建文章草稿 |

## 内容位置

- 站点配置：`src/config.ts`
- About 页面：`src/content/spec/about.md`
- 文章内容：`src/content/posts/`
- 站点外观：`src/components/` 与 `src/layouts/`


## 部署前

部署前请设置 `SITE` 环境变量，用来生成正确的 RSS、`robots.txt` 和 `sitemap` 地址。
```sh
SITE=https://your-domain.com
```
或通过在项目根目录创建`.env` 文件写入`SITE=https://your-domain.com`


如果你不想使用环境变量，也可以直接修改 `astro.config.mjs` 里的 `site` 配置
参考[官方指南](https://docs.astro.build/zh-cn/guides/deploy/)将博客部署至 Vercel, Netlify, GitHub Pages 等；部署前需编辑 `astro.config.mjs` 中的站点设置