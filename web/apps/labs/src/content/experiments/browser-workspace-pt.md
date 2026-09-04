---
title: "Crie um workspace no navegador que nunca prenda o usuário"
description: "Uma arquitetura prática para trabalhar com uma pasta escolhida ou com armazenamento do navegador sem mudar o fluxo do editor."
summary: "Um contrato de workspace, dois adaptadores, permissões explícitas e recuperação exportável mantêm o local-first útil mesmo sem acesso a pastas."
tags: ["local-first", "files", "indexeddb"]
category: "Local-first"
format: "tutorial"
icon: "folder_open"
color: "var(--palette-labs-accent)"
lang: pt
order: 1
featured: true
---

Um editor local-first não deve exigir que a pessoa entenda o armazenamento do navegador antes de criar algo. Abrir, salvar e visualizar precisa funcionar igual em uma pasta escolhida ou em um espaço gerenciado pelo navegador.

## Use um único contrato de workspace

A interface deve chamar operações como `list`, `read`, `write` e `remove`. Um adaptador implementa essas operações para a pasta local; outro usa IndexedDB ou OPFS. A interface não precisa saber qual está ativo.

## Dois modos de armazenamento

- A pasta só pode ser aberta por uma ação consciente e nunca deve ser explorada além do diretório autorizado.
- O workspace do navegador é o padrão normal, não um erro, e deve criar a mesma estrutura de projetos e `images/`.
- Se a permissão for perdida, mantenha o documento na memória e ofereça uma exportação de recuperação.

## Migre sem perder trabalho

Trocar de adaptador é uma migração: copie, verifique cada arquivo e só então ative o destino. Nunca apague a origem automaticamente. Como o navegador pode limpar dados, ofereça exportação de projeto, exportação completa e importação com validação de caminhos.

## Privacidade e entrega

Caminhos, nomes, handles e conteúdo devem ficar no dispositivo. O provedor de hospedagem ainda pode ver IP, horário e metadados de roteamento. Antes de publicar, confirme que a edição funciona sem conta ou pasta e que a rede não recebe documentos nem nomes de arquivos.
