---
title: "बिना रुकावट बढ़ने वाली Typst प्रोजेक्ट संरचना"
description: "दस्तावेज़, चित्र, साझा styles और exports को व्यवस्थित करें ताकि एक browser workspace में कई projects रहें।"
summary: "हर दस्तावेज़ आत्मनिर्भर रखें, साझा संसाधन सोचकर बनाएँ और folder तथा browser storage में समान paths resolve करें।"
tags: ["typst", "files", "local-first"]
category: "Typst"
format: "tutorial"
icon: "description"
color: "var(--palette-typst-accent)"
lang: hi
order: 3
---

कई projects वाले workspace को अतिरिक्त `projects/` wrapper की ज़रूरत नहीं है। हर top-level folder एक project हो सकता है, जिससे paths छोटे और tree स्पष्ट रहती है।

## हर project का एक folder

`main.typ`, project-specific styles और `images/` साथ रखें। Editor current project root से relative paths resolve करे ताकि वही दस्तावेज़ local folder और browser storage दोनों में compile हो।

## चित्र सामान्य files हैं

वे tree में दिखें और rename, replace व export हो सकें। Import केवल current project के `images/` में copy करे और कभी चुपचाप upload न करे।

## styles सोचकर साझा करें

केवल स्थिर और कई projects में प्रयुक्त templates साझा क्षेत्र में रखें। हर project दूसरे project की internal files पर अनजाने निर्भर हुए बिना export हो सके।

## source और output अलग रखें

PDF और temporary previews source tree में न मिलाएँ। Starter project में entry file, images folder और exportable recovery हो; दोनों storage adapters समान tests पास करें।
