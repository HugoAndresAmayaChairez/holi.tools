---
title: "Holi QR छोटा Rust कोर क्यों रखता है"
description: "परीक्षित QR लॉजिक Rust में और ब्राउज़र व्यवहार व UI TypeScript में रखने का निर्णय मार्गदर्शक।"
summary: "Rust तब उचित है जब शुद्ध परीक्षित encoder का वास्तविक वेब उपभोक्ता हो; ब्राउज़र APIs और उत्पाद स्थिति TypeScript में रहें।"
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: hi
order: 20
---

Holi QR के encoding core का वास्तविक वेब उपभोक्ता है, इसलिए छोटा Rust मॉड्यूल उचित हो सकता है। इसका अर्थ पूरे ऐप को Rust में ले जाना नहीं है।

## उपयोगी सीमा

“शुद्ध core + पतला adapter” रखें: Rust deterministic encoding और matrix बनाए; WASM ब्राउज़र-मित्र मान बदले; TypeScript फ़ाइल, clipboard, canvas, state, accessibility और UI संभाले।

## Rust रखने की शर्त

कोर छोटा, परीक्षित और ब्राउज़र-कवर्ड रहे। हर गति दावे को वर्तमान ब्राउज़र और हार्डवेयर पर दोहराने योग्य बेंचमार्क से सिद्ध करें, जिसमें bundle और initialization लागत भी हो।

## केवल समानता के लिए न बढ़ाएँ

CLI, TUI या सार्वजनिक Rust पैकेज अपने-आप मूल्य नहीं बनाते। नया surface तभी जोड़ें जब वास्तविक उपयोगकर्ता और shipping flow हो।

## सत्यापन

ज्ञात QR fixtures से आउटपुट मिलाएँ, WASM सीमा ब्राउज़र में जाँचें, त्रुटियाँ समझने योग्य रखें और TypeScript fallback या failure state को उपयोगी बनाए रखें।
