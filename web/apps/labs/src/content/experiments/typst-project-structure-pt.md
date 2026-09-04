---
title: "Uma estrutura de projeto Typst que cresce sem atrito"
description: "Organize documentos, imagens, estilos compartilhados e exportações para manter vários projetos em um workspace."
summary: "Mantenha cada documento autocontido, compartilhe só o que for deliberado e resolva os mesmos caminhos nos dois modos de armazenamento."
tags: ["typst", "files", "local-first"]
category: "Typst"
format: "tutorial"
icon: "description"
color: "var(--palette-typst-accent)"
lang: pt
order: 3
---

Um workspace com vários projetos não precisa de uma pasta extra `projects/`. Cada pasta de topo pode ser um projeto, com caminhos mais curtos e uma árvore mais clara.

## Uma pasta por projeto

Mantenha `main.typ`, estilos específicos e `images/` juntos. O editor resolve caminhos a partir da raiz do projeto, então o mesmo documento compila em pasta local ou armazenamento do navegador.

## Imagens são arquivos comuns

Elas devem aparecer na árvore, aceitar renomear, substituir e exportar. A importação copia apenas para `images/` do projeto atual e nunca faz upload silencioso.

## Compartilhe estilos com cuidado

Só mova para uma área compartilhada o que for estável e usado por vários projetos. Cada projeto deve poder ser exportado sem depender acidentalmente de arquivos internos de outro.

## Separe fonte e saída

PDFs e previews temporários não pertencem à árvore de fonte. Um projeto inicial precisa de entrada, pasta de imagens e recuperação exportável; ambos os adaptadores devem passar pelos mesmos testes.
