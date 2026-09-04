---
title: "ऐसा QR बनाएँ जो स्कैन होता रहे"
description: "कॉन्ट्रास्ट, quiet zone, error correction, logo और export सत्यापन की दृश्य सूची।"
summary: "सजावट को मशीन-पठनीय चिन्ह के आसपास सीमित रखें और केवल editor preview नहीं, वास्तविक export जाँचें।"
tags: ["qr", "design", "accessibility"]
category: "QR"
format: "tutorial"
icon: "qr_code_scanner"
color: "var(--palette-qr-accent)"
lang: hi
order: 2
---

सुंदर QR तभी उपयोगी है जब वास्तविक कैमरा, स्क्रीन और प्रिंट उसे पढ़ें। सजावट को encoded संरचना का सम्मान करना चाहिए।

## कॉन्ट्रास्ट और quiet zone से शुरू करें

गहरे modules और हल्के background के बीच स्थिर कॉन्ट्रास्ट रखें। finder patterns पर texture न रखें और code के चारों ओर साफ़ जगह बनाए रखें।

## error correction और logo सोचकर चुनें

Logo डेटा ढकता है। ऊँचा correction सहनशीलता बढ़ाता है लेकिन घनत्व भी बढ़ाता है। Logo छोटा रखें, तीन finder patterns न ढकें और correction को असीम अनुमति न मानें।

## वास्तविक export जाँचें

PNG, SVG या PDF को छोटे आकार, कम रोशनी, कोण और प्रिंट में कई devices से scan करें। Editor canvas का पास होना resized export की गारंटी नहीं है।

## सुरक्षित editor दें

Live readability स्थिति, सुरक्षित defaults और reset दें। चुनी हुई images और QR content स्थानीय रहें; hosting provider फिर भी connection metadata देख सकता है।
