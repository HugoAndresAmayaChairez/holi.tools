---
title: "ঝামেলা ছাড়া বাড়তে পারে এমন Typst project structure"
description: "Document, image, shared style ও export সাজিয়ে একটি browser workspace-এ একাধিক project রাখুন।"
summary: "প্রতিটি document self-contained রাখুন, ইচ্ছাকৃতভাবে resource share করুন এবং folder ও browser storage-এ একই path resolve করুন।"
tags: ["typst", "files", "local-first"]
category: "Typst"
format: "tutorial"
icon: "description"
color: "var(--palette-typst-accent)"
lang: bn
order: 3
---

Multi-project workspace-এর জন্য অতিরিক্ত `projects/` wrapper দরকার নেই। প্রতিটি top-level folder একটি project হতে পারে, ফলে path ছোট ও tree পরিষ্কার থাকে।

## প্রতি project-এ একটি folder

`main.typ`, project-specific style ও `images/` একসঙ্গে রাখুন। Editor current project root থেকে relative path resolve করবে, তাই একই document local folder ও browser storage-এ compile হবে।

## Image সাধারণ file

Image tree-তে দেখা যাবে এবং rename, replace ও export করা যাবে। Import শুধু current project-এর `images/`-এ copy করবে এবং নীরবে upload করবে না।

## Style সাবধানে share করুন

শুধু স্থিতিশীল ও একাধিক project-এ ব্যবহৃত template shared area-তে রাখুন। অন্য project-এর internal file-এর ওপর অনিচ্ছাকৃত নির্ভরতা ছাড়া প্রতিটি project export করা যাবে।

## Source ও output আলাদা রাখুন

PDF ও temporary preview source tree-তে মেশাবেন না। Starter project-এ entry file, images folder ও exportable recovery থাকবে; দুই storage adapter একই test pass করবে।
