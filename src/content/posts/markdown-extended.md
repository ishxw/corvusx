---
title: "Corvusx 写作速查"
published: 2026-05-04
updated: 2026-05-06
description: "记录这个博客常用的 Markdown 扩展语法，方便以后发文时直接复制。"
image: ""
tags: ["写作", "Markdown", "Astro"]
category: "站点"
draft: false
lang: ""
---

这篇文章保留给未来的我，当作一个随手可查的写作备忘录。


## GitHub 仓库卡片

::github{repo="withastro/astro"}

```markdown
::github{repo="withastro/astro"}
```

## 提示块

支持 `note`、`tip`、`important`、`warning` 和 `caution` 这几种类型。

:::note
适合放「读者就算快速浏览也应该看到」的信息。
:::

:::tip
适合放一些不会影响理解、但能提升阅读体验的小提示。
:::

:::important
适合放必须注意的关键信息。
:::

```markdown
:::note
适合放「读者就算快速浏览也应该看到」的信息。
:::

:::tip
适合放一些不会影响理解、但能提升阅读体验的小提示。
:::
```

## 自定义标题

:::note[写作提醒]
这里可以放带自定义标题的提示块。
:::

```markdown
:::note[写作提醒]
这里可以放带自定义标题的提示块。
:::
```

## GitHub 风格提示块

```
> [!NOTE]
> 这种 GitHub 风格写法也能正常渲染。

> [!TIP]
> 适合从 issue、PR 或文档里直接复制过来。
```

## Spoiler

这段内容 :spoiler[默认会折叠显示，并且支持 **Markdown**]。

```markdown
这段内容 :spoiler[默认会折叠显示，并且支持 **Markdown**]。
```

## 代码块

```ts title="src/config.ts"
export const siteConfig = {
  title: "Corvusx",
  subtitle: "代码、系统与随笔的个人博客",
};
```

## 数学公式

行内公式示例：$\omega = d\phi / dt$。

$$I = \int \rho R^{2} dV$$

