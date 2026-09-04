---
title: "Holi QR কেন ছোট Rust core রাখে"
description: "পরীক্ষিত QR logic Rust-এ রেখে browser behavior ও UI TypeScript-এ রাখার সিদ্ধান্ত নির্দেশিকা।"
summary: "Pure tested encoder-এর বাস্তব web consumer থাকলেই Rust মূল্য দেয়; browser APIs ও product state TypeScript-এ থাকে।"
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: bn
order: 20
---

Holi QR-এর encoding core-এর বাস্তব web consumer আছে, তাই ছোট Rust module যৌক্তিক। এর মানে পুরো app Rust-এ সরানো নয়।

## কার্যকর সীমানা

“Pure core + thin adapter” রাখুন: Rust deterministic encoding ও matrix তৈরি করবে; WASM browser-friendly value রূপান্তর করবে; TypeScript file, clipboard, canvas, state, accessibility ও UI সামলাবে।

## Rust রাখার শর্ত

Core ছোট, tested ও browser-covered থাকবে। বর্তমান browser ও hardware-এ reproducible benchmark দিয়ে প্রতিটি speed claim প্রমাণ করুন এবং bundle ও initialization cost ধরুন।

## শুধু symmetry-এর জন্য বাড়াবেন না

CLI, TUI বা public Rust package নিজে থেকে মূল্য তৈরি করে না। বাস্তব user ও shipping flow থাকলেই নতুন surface যোগ করুন।

## যাচাই

Known QR fixture-এর সঙ্গে output মিলিয়ে দেখুন, browser-এ WASM boundary পরীক্ষা করুন, error message অর্থপূর্ণ রাখুন এবং TypeScript fallback বা failure state ব্যবহারযোগ্য রাখুন।
