---
title: "Escreva um rótulo de privacidade que as pessoas possam verificar"
description: "Acompanhe os dados da entrada ao destinatário e transforme o resultado em um resumo curto e honesto."
summary: "Um bom rótulo separa conteúdo local de metadados de conexão, identifica modos conectados e acompanha mudanças na implementação."
tags: ["privacy", "metadata", "product"]
category: "Privacidade"
format: "tutorial"
icon: "shield"
color: "var(--palette-labs-accent)"
lang: pt
order: 4
---

“Privado” não é uma promessa específica o bastante. A pessoa precisa saber onde o conteúdo é processado, por quanto tempo fica salvo, quando há rede e quem vê metadados técnicos.

## Desenhe o fluxo completo

Registre: entrada → memória → armazenamento → rede → provedor → destinatário. Para cada etapa, indique o tipo de dado, o gatilho, a retenção e quem controla. Abrir um arquivo local não deve enviá-lo silenciosamente.

## Separe conteúdo de metadados

O documento pode ficar no dispositivo enquanto Cloudflare ou outro provedor processa IP, horário, rota, volume e roteamento. WebRTC direto e relay também têm propriedades diferentes; mostre o modo ativo.

## Coloque o resumo perto da ação

Explique processamento local, armazenamento e limite de rede em poucas linhas, com acesso aos detalhes. Evite frases absolutas como “zero dados” ou “anonimato total”.

## Verificação

Atualize o rótulo quando adicionar requests, logs, analytics, sincronização ou provedores. Use as ferramentas de rede do navegador para confirmar que o texto corresponde ao comportamento real.
