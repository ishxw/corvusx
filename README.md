# Corvusx

基于 [Astro](https://astro.build/) 与 [Fuwari](https://github.com/saicaca/fuwari) 定制的个人博客。

## 本地开发

```sh
pnpm install
pnpm dev
```

## 发布

```sh
pnpm build
pnpm preview
```


默认开发地址是 `http://localhost:4321/`。

```sh
后台管理面板
   * 用户名：admin
   * 默认密码：admin123456
```

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

如果你不想使用环境变量，也可以直接修改 `astro.config.mjs` 里的 `site` 配置。
