---
title: "Por que o Holi QR mantém um pequeno núcleo em Rust"
description: "Um guia para colocar a lógica testada de QR em Rust e manter comportamento do navegador e interface em TypeScript."
summary: "Rust vale a pena quando um encoder puro e testado tem um consumidor web real; APIs do navegador e estado continuam em TypeScript."
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: pt
order: 20
---

O núcleo de codificação do Holi QR tem um consumidor web real, por isso um módulo pequeno em Rust pode fazer sentido. Isso não significa mover o aplicativo inteiro para Rust.

## A fronteira útil

Mantenha “núcleo puro + adaptador fino”: Rust faz codificação determinística e matriz; WASM converte valores amigáveis ao navegador; TypeScript cuida de arquivos, clipboard, canvas, estado, acessibilidade e UI.

## Condição para manter Rust

O núcleo deve continuar pequeno, testado e coberto no navegador. Qualquer ganho precisa de benchmark reproduzível em navegadores e hardware atuais, incluindo custo de bundle e inicialização.

## O que não deve crescer por simetria

CLI, TUI ou pacote Rust público não geram valor automaticamente. Só adicione uma superfície quando existir um usuário e um fluxo de entrega reais.

## Verificação

Compare com fixtures conhecidas, teste a fronteira WASM, preserve erros compreensíveis e confirme que o fallback ou estado de falha em TypeScript continua utilizável.
