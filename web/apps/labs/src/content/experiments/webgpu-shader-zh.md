---
title: "何时 WebGPU 背景值得它的成本"
description: "一份渐进增强清单，确保视觉效果永远不会阻挡产品的核心流程。"
summary: "只有当 WebGPU 效果有可测价值、在有用内容之后启动、尊重减少动态设置并提供安静的 CSS 回退时才使用它。"
tags: ["webgpu", "graphics", "performance"]
category: "图形"
format: "field-note"
icon: "auto_awesome"
color: "var(--palette-labs-accent)"
lang: zh
order: 40
---

背景效果是增强项，不是应用依赖。用户应先看到内容并能完成任务，然后才加载图形管线。

## 先提供有用内容

延迟初始化 WebGPU，不要让着色器编译阻塞首屏或输入。失败时保持界面可用，并避免把大型 WASM 或纹理放在关键请求链中。

## 尊重设备与用户

响应 `prefers-reduced-motion`，在电量不足、标签页隐藏或帧率下降时暂停。限制分辨率和设备像素比，并在窄屏设备上使用更安静的效果。

## 提供完整回退

CSS 渐变或静态背景必须保留产品层级、对比度和品牌感。缺少 WebGPU 不应显示错误或空白页面。

## 先测量再保留

记录 LCP、交互延迟、内存、能耗迹象和包体。若效果没有改善理解、品牌或转化，就删除它；技术新颖本身不是产品价值。
