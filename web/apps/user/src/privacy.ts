import type { LanguageCode } from "@holi/configs/i18n";

const privacyByLang = {
  en: {
    title: "Privacy summary",
    summary:
      "Your identity and vault stay local by default. When you connect, peers and providers can observe technical metadata.",
    detailsLabel: "Details",
    skip: "Skip to content",
    socialAlt: "Holi User — Private by design. Yours by default.",
    aboutTitle: "About Holi User",
    aboutBody:
      "Holi User is a local-first identity and P2P collaboration container. Identity and contacts stay on your device by default; when you connect, infrastructure and other participants can observe the technical metadata disclosed for that session.",
    facts: [
      ["Storage", "Identity, contacts, projects, and history live in this browser or a directory you authorize.", "local"],
      ["Direct connections", "A direct WebRTC session can reveal network addresses between participants.", "warning"],
      ["Providers", "Cloudflare, signaling, or relay services may process IP, time, activity, traffic volume, and routing data.", "connected"],
      ["Encryption", "Direct messages use an application envelope; projects currently use WebRTC transport encryption.", "connected"],
    ],
  },
  es: {
    title: "Resumen de privacidad",
    summary:
      "Tu identidad y vault permanecen locales por defecto. Al conectarte, pares y proveedores pueden observar metadatos técnicos.",
    detailsLabel: "Detalles",
    skip: "Saltar al contenido",
    socialAlt: "Holi User — Privado desde el diseño. Tuyo por defecto.",
    aboutTitle: "Sobre Holi User",
    aboutBody:
      "Holi User es un contenedor local-first para tu identidad y colaboración P2P. La identidad y los contactos permanecen en tu dispositivo por defecto; al conectarte, la infraestructura y otras personas pueden observar los metadatos técnicos indicados para esa sesión.",
    facts: [
      ["Almacenamiento", "Identidad, contactos, proyectos e historial se guardan en este navegador o en una carpeta que autorizas.", "local"],
      ["Conexiones directas", "Una sesión WebRTC directa puede revelar direcciones de red entre participantes.", "warning"],
      ["Proveedores", "Cloudflare, la señalización o los relays pueden procesar IP, horario, actividad, volumen y datos de enrutamiento.", "connected"],
      ["Cifrado", "Los mensajes directos usan un sobre de aplicación; los proyectos usan actualmente el cifrado de transporte de WebRTC.", "connected"],
    ],
  },
  zh: {
    title: "隐私摘要",
    summary: "默认情况下，你的身份和保管库保留在本地。连接后，对等方和服务提供商可能看到技术元数据。",
    detailsLabel: "详情",
    skip: "跳到主要内容",
    socialAlt: "Holi User — 以隐私为设计原则，默认由你掌控。",
    aboutTitle: "关于 Holi User",
    aboutBody: "Holi User 是一个本地优先的身份与 P2P 协作容器。身份和联系人默认保留在你的设备上；连接后，基础设施和其他参与者可能看到该会话所披露的技术元数据。",
    facts: [
      ["存储", "身份、联系人、项目和历史记录保存在此浏览器或你授权的文件夹中。", "local"],
      ["直接连接", "直接 WebRTC 会话可能向参与者彼此暴露网络地址。", "warning"],
      ["服务提供商", "Cloudflare、信令或中继服务可能处理 IP、时间、活动、流量和路由数据。", "connected"],
      ["加密", "私信使用应用层加密信封；项目目前使用 WebRTC 传输加密。", "connected"],
    ],
  },
  hi: {
    title: "गोपनीयता सारांश",
    summary: "आपकी पहचान और वॉल्ट डिफ़ॉल्ट रूप से स्थानीय रहते हैं। कनेक्ट होने पर पीयर और सेवा प्रदाता तकनीकी मेटाडेटा देख सकते हैं।",
    detailsLabel: "विवरण",
    skip: "मुख्य सामग्री पर जाएँ",
    socialAlt: "Holi User — डिज़ाइन से निजी, डिफ़ॉल्ट रूप से आपका।",
    aboutTitle: "Holi User के बारे में",
    aboutBody: "Holi User पहचान और P2P सहयोग के लिए लोकल-फ़र्स्ट कंटेनर है। पहचान और संपर्क डिफ़ॉल्ट रूप से आपके डिवाइस पर रहते हैं; कनेक्ट होने पर बुनियादी ढाँचा और अन्य प्रतिभागी उस सत्र के बताए गए तकनीकी मेटाडेटा देख सकते हैं।",
    facts: [
      ["स्टोरेज", "पहचान, संपर्क, प्रोजेक्ट और इतिहास इस ब्राउज़र या आपकी अधिकृत डायरेक्टरी में रहते हैं।", "local"],
      ["सीधे कनेक्शन", "सीधा WebRTC सत्र प्रतिभागियों के बीच नेटवर्क पते प्रकट कर सकता है।", "warning"],
      ["सेवा प्रदाता", "Cloudflare, सिग्नलिंग या रिले सेवाएँ IP, समय, गतिविधि, ट्रैफ़िक मात्रा और रूटिंग डेटा प्रोसेस कर सकती हैं।", "connected"],
      ["एन्क्रिप्शन", "सीधे संदेश ऐप्लिकेशन एन्क्रिप्शन लिफ़ाफ़ा उपयोग करते हैं; प्रोजेक्ट अभी WebRTC ट्रांसपोर्ट एन्क्रिप्शन उपयोग करते हैं।", "connected"],
    ],
  },
  ar: {
    title: "ملخص الخصوصية",
    summary: "تبقى هويتك وخزنتك محليتين افتراضيًا. عند الاتصال، قد يرى النظراء ومقدمو الخدمات بيانات وصفية تقنية.",
    detailsLabel: "التفاصيل",
    skip: "الانتقال إلى المحتوى",
    socialAlt: "Holi User — خاص بحكم التصميم، وملكك افتراضيًا.",
    aboutTitle: "حول Holi User",
    aboutBody: "Holi User حاوية محلية أولًا للهوية والتعاون عبر P2P. تبقى الهوية وجهات الاتصال على جهازك افتراضيًا؛ وعند الاتصال قد ترى البنية التحتية والمشاركون الآخرون البيانات الوصفية التقنية المعلنة لتلك الجلسة.",
    facts: [
      ["التخزين", "توجد الهوية وجهات الاتصال والمشاريع والسجل في هذا المتصفح أو في مجلد تسمح به.", "local"],
      ["الاتصالات المباشرة", "قد تكشف جلسة WebRTC المباشرة عناوين الشبكة بين المشاركين.", "warning"],
      ["مقدمو الخدمات", "قد تعالج Cloudflare أو خدمات الإشارة أو الترحيل عنوان IP والوقت والنشاط وحجم البيانات ومعلومات التوجيه.", "connected"],
      ["التشفير", "تستخدم الرسائل المباشرة غلاف تشفير في التطبيق؛ وتستخدم المشاريع حاليًا تشفير نقل WebRTC.", "connected"],
    ],
  },
  bn: {
    title: "গোপনীয়তার সারাংশ",
    summary: "আপনার পরিচয় ও ভল্ট ডিফল্টভাবে স্থানীয় থাকে। সংযুক্ত হলে পিয়ার ও পরিষেবা প্রদানকারীরা প্রযুক্তিগত মেটাডেটা দেখতে পারে।",
    detailsLabel: "বিস্তারিত",
    skip: "মূল কনটেন্টে যান",
    socialAlt: "Holi User — নকশাতেই ব্যক্তিগত, ডিফল্টভাবে আপনার।",
    aboutTitle: "Holi User সম্পর্কে",
    aboutBody: "Holi User পরিচয় ও P2P সহযোগিতার জন্য লোকাল-ফার্স্ট কনটেইনার। পরিচয় ও পরিচিতির তথ্য ডিফল্টভাবে আপনার ডিভাইসে থাকে; সংযুক্ত হলে অবকাঠামো ও অন্য অংশগ্রহণকারীরা সেই সেশনের প্রকাশিত প্রযুক্তিগত মেটাডেটা দেখতে পারে।",
    facts: [
      ["স্টোরেজ", "পরিচয়, পরিচিতি, প্রজেক্ট ও ইতিহাস এই ব্রাউজার বা আপনার অনুমোদিত ফোল্ডারে থাকে।", "local"],
      ["সরাসরি সংযোগ", "সরাসরি WebRTC সেশন অংশগ্রহণকারীদের মধ্যে নেটওয়ার্ক ঠিকানা প্রকাশ করতে পারে।", "warning"],
      ["পরিষেবা প্রদানকারী", "Cloudflare, সিগন্যালিং বা রিলে পরিষেবা IP, সময়, কার্যকলাপ, ট্রাফিকের পরিমাণ ও রাউটিং ডেটা প্রক্রিয়া করতে পারে।", "connected"],
      ["এনক্রিপশন", "সরাসরি বার্তা অ্যাপ্লিকেশন এনক্রিপশন এনভেলপ ব্যবহার করে; প্রজেক্ট বর্তমানে WebRTC ট্রান্সপোর্ট এনক্রিপশন ব্যবহার করে।", "connected"],
    ],
  },
  pt: {
    title: "Resumo de privacidade",
    summary: "Sua identidade e seu cofre permanecem locais por padrão. Ao se conectar, pares e provedores podem observar metadados técnicos.",
    detailsLabel: "Detalhes",
    skip: "Ir para o conteúdo",
    socialAlt: "Holi User — Privado desde o projeto. Seu por padrão.",
    aboutTitle: "Sobre o Holi User",
    aboutBody: "O Holi User é um contêiner local-first para identidade e colaboração P2P. A identidade e os contatos permanecem no seu dispositivo por padrão; ao se conectar, a infraestrutura e outros participantes podem observar os metadados técnicos informados para a sessão.",
    facts: [
      ["Armazenamento", "Identidade, contatos, projetos e histórico ficam neste navegador ou em uma pasta que você autorizar.", "local"],
      ["Conexões diretas", "Uma sessão WebRTC direta pode revelar endereços de rede entre participantes.", "warning"],
      ["Provedores", "Cloudflare, serviços de sinalização ou relay podem processar IP, horário, atividade, volume de tráfego e dados de roteamento.", "connected"],
      ["Criptografia", "Mensagens diretas usam um envelope de aplicação; os projetos usam atualmente a criptografia de transporte do WebRTC.", "connected"],
    ],
  },
} as const;

export function getUserPrivacy(lang: string) {
  const locale = (lang in privacyByLang ? lang : "en") as LanguageCode;
  const copy = privacyByLang[locale];
  return {
    id: "user-privacy",
    ...copy,
    facts: copy.facts.map(([label, value, tone]) => ({ label, value, tone })),
  };
}
