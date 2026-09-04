---
title: "为什么 Holi QR 保留一个小型 Rust 核心"
description: "把经过测试的 QR 逻辑放在 Rust 中，同时让浏览器行为和界面留在 TypeScript 的决策指南。"
summary: "只有纯净、经过测试的编码器存在实际网页使用方时，Rust 才有价值；浏览器 API 和产品状态继续使用 TypeScript。"
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: zh
order: 20
---

Holi QR 的编码核心有真实网页使用方，因此一个小型 Rust 模块是合理的。这并不意味着整个应用都应该迁移到 Rust。

## 合理边界

结构应保持为“纯核心 + 薄适配器”：Rust 负责确定性编码和矩阵生成；WASM 只转换浏览器友好的值；TypeScript 负责文件、剪贴板、画布、状态、无障碍和界面。

## 保留 Rust 的门槛

核心必须保持小型、经过单元测试，并在浏览器中覆盖。任何性能优势都应通过当前浏览器和硬件上的可复现基准证明，同时计入包体和初始化成本。

## 不应随之扩张的部分

CLI、TUI 或公开 Rust 包不会自动产生价值。只有存在实际用户和发布用途时才添加这些表面。

## 验证

对照已知 QR 固件比较输出，测试 WASM 边界，检查错误信息，并确保 TypeScript 回退或失败状态仍然可用。
