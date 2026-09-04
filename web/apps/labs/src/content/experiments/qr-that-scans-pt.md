---
title: "Projete um QR que continue escaneando"
description: "Checklist visual de contraste, margem livre, correção de erros, logos e validação da exportação."
summary: "Trate a decoração como uma camada limitada ao redor de um símbolo legível por máquina e verifique o arquivo exportado."
tags: ["qr", "design", "accessibility"]
category: "QR"
format: "tutorial"
icon: "qr_code_scanner"
color: "var(--palette-qr-accent)"
lang: pt
order: 2
---

Um QR bonito só é útil se funcionar em câmeras, telas e impressões reais. A decoração deve respeitar a estrutura codificada.

## Comece com contraste e margem livre

Use contraste estável entre módulos escuros e fundo claro. Não coloque textura sobre os padrões de localização e preserve uma área limpa ao redor do código.

## Escolha correção de erros e logo com cuidado

O logo cobre dados. Mais correção aumenta tolerância, mas também densidade. Mantenha o logo moderado, nunca cubra os três marcadores e não trate correção como licença ilimitada.

## Teste a exportação real

Escaneie PNG, SVG ou PDF em tamanho pequeno, brilho baixo, ângulo e impressão, usando mais de um aparelho. O canvas do editor funcionar não garante que a exportação redimensionada funcione.

## Ofereça um editor seguro

Mostre legibilidade em tempo real, use padrões conservadores e permita restaurá-los. Imagens e conteúdo do QR ficam locais; a hospedagem ainda pode observar metadados de conexão.
