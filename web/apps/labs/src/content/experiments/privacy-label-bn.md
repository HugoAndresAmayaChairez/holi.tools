---
title: "মানুষ যাচাই করতে পারে এমন গোপনীয়তার লেবেল লিখুন"
description: "Input থেকে recipient পর্যন্ত data অনুসরণ করে ফলাফলকে ছোট ও সৎ product summary-তে রূপ দিন।"
summary: "ভালো privacy label স্থানীয় content ও connection metadata আলাদা করে, active mode জানায় এবং implementation-এর সঙ্গে হালনাগাদ থাকে।"
tags: ["privacy", "metadata", "product"]
category: "গোপনীয়তা"
format: "tutorial"
icon: "shield"
color: "var(--palette-labs-accent)"
lang: bn
order: 4
---

“ব্যক্তিগত” শব্দটি একা যথেষ্ট নির্দিষ্ট প্রতিশ্রুতি নয়। Content কোথায় process হয়, কতক্ষণ থাকে, কখন network লাগে এবং technical metadata কে দেখে—ব্যবহারকারীর তা জানা দরকার।

## সম্পূর্ণ প্রবাহ আঁকুন

লিখুন: input → memory → storage → network → provider → recipient। প্রতিটি ধাপে data type, trigger, retention ও controller জানান। Local file খোলা যেন নীরবে upload না করে।

## Content ও metadata আলাদা করুন

Document ডিভাইসে থাকতে পারে, তবু Cloudflare বা transport service IP, time, path, volume ও routing process করতে পারে। Direct WebRTC ও relay-এর বৈশিষ্ট্য আলাদা; active mode দেখান।

## কাজের কাছেই summary রাখুন

Local processing, storage ও network boundary কয়েক লাইনে বলুন এবং details-এর link দিন। “Zero data” বা “সম্পূর্ণ anonymous”-এর মতো absolute দাবি এড়ান।

## যাচাই

নতুন request, log, analytics, sync বা provider যোগ হলে label update করুন। Browser network tools দিয়ে লেখা ও বাস্তব behavior মিলিয়ে দেখুন।
