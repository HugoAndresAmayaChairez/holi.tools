---
title: "Quando um fundo WebGPU vale o custo"
description: "Checklist de melhoria progressiva para efeitos visuais que nunca bloqueiam o fluxo do produto."
summary: "Use WebGPU quando houver valor medido, início após o conteúdo útil, respeito a movimento reduzido e um fallback CSS completo."
tags: ["webgpu", "graphics", "performance"]
category: "Gráficos"
format: "field-note"
icon: "auto_awesome"
color: "var(--palette-labs-accent)"
lang: pt
order: 40
---

Um fundo é uma melhoria, não uma dependência. A pessoa deve ver conteúdo e concluir a tarefa antes que a pipeline gráfica seja necessária.

## Carregue o útil primeiro

Atrase a inicialização do WebGPU e não deixe a compilação de shaders bloquear a primeira tela ou a entrada. Se falhar, a interface continua funcional e sem grandes recursos na cadeia crítica.

## Respeite dispositivo e pessoa

Obedeça `prefers-reduced-motion`, pause com aba oculta, bateria baixa ou queda de quadros, e limite resolução e densidade de pixels em telas menores.

## Tenha um fallback completo

Um gradiente CSS ou fundo estático precisa preservar hierarquia, contraste e identidade. A ausência de WebGPU nunca deve produzir erro ou página vazia.

## Meça antes de manter

Observe LCP, interação, memória, sinais de energia e bundle. Se o efeito não melhorar entendimento, marca ou conversão, remova-o; novidade técnica não é valor por si só.
