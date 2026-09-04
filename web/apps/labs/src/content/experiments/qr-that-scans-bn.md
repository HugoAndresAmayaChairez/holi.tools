---
title: "এমন QR ডিজাইন করুন যা স্ক্যান হতে থাকে"
description: "Contrast, quiet zone, error correction, logo ও export verification-এর visual checklist।"
summary: "Decoration-কে machine-readable symbol-এর চারপাশে সীমিত রাখুন এবং শুধু editor preview নয়, আসল export পরীক্ষা করুন।"
tags: ["qr", "design", "accessibility"]
category: "QR"
format: "tutorial"
icon: "qr_code_scanner"
color: "var(--palette-qr-accent)"
lang: bn
order: 2
---

সুন্দর QR তখনই উপকারী যখন বাস্তব camera, screen ও print সেটি পড়তে পারে। Decoration-কে encoded structure মানতে হবে।

## Contrast ও quiet zone দিয়ে শুরু করুন

Dark module ও light background-এর মধ্যে স্থিতিশীল contrast রাখুন। Finder pattern-এর ওপর texture দেবেন না এবং code-এর চারপাশে পরিষ্কার জায়গা রাখুন।

## Error correction ও logo ভেবে বাছুন

Logo data ঢেকে দেয়। বেশি correction সহনশীলতা বাড়ায়, কিন্তু density-ও বাড়ায়। Logo মাঝারি রাখুন, তিনটি finder pattern ঢাকবেন না এবং correction-কে সীমাহীন অনুমতি ভাববেন না।

## আসল export পরীক্ষা করুন

PNG, SVG বা PDF ছোট size, কম আলো, angle ও print অবস্থায় একাধিক device দিয়ে scan করুন। Editor canvas pass করলেই resized export pass করবে না।

## নিরাপদ editor দিন

Live readability status, নিরাপদ defaults ও reset দিন। নির্বাচিত image ও QR content local থাকবে; hosting provider তবুও connection metadata দেখতে পারে।
