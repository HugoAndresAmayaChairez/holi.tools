---
title: "Como comparar WASM e JavaScript de forma justa"
description: "Um checklist reproduzível para navegador que inclui inicialização, transferência, memória e latência percebida."
summary: "Um benchmark útil mede todo o caminho entregue e publica o ambiente, em vez de tratar tempos isolados como verdade do produto."
tags: ["performance", "wasm", "javascript"]
category: "Desempenho"
format: "experiment"
icon: "speed"
color: "var(--palette-labs-accent)"
lang: pt
order: 30
---

O benchmark deve responder a uma pergunta percebida pelo usuário: quanto demora a primeira abertura, a primeira geração ou uma sequência de edições? Medir só um loop aquecido ignora download, compilação e inicialização.

## Registre o ambiente completo

Informe navegador, sistema, dispositivo, economia de energia, estado do cache, modo de build e tamanho dos recursos. Separe início frio de execução aquecida e faça as duas implementações produzirem o mesmo resultado.

## Publique distribuições

Aqueça o teste, execute rodadas suficientes e reporte mediana e percentis altos. Preserve a explicação dos valores fora da curva. Em tarefas síncronas, observe bloqueio da thread principal e latência de interação.

## Decida com custos de produto

Compare também bundle, inicialização, memória, manutenção e fallback. WASM só merece permanecer quando o ganho é reproduzível e visível. Publique scripts, entradas e ambiente junto com a conclusão.
