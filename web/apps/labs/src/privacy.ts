import type { LanguageCode } from "@holi/configs/i18n";

const privacyByLang = {
  en: {
    title: "Privacy summary",
    summary: "Reading and exporting articles does not give personal files to Holi. Cloudflare can observe your IP and access time.",
    detailsLabel: "Details",
    facts: [
      ["Content", "Labs publishes static articles and does not request your local documents.", "local"],
      ["Export", "Copying summaries and generating Markdown or print output happens in your browser.", "local"],
      ["Hosting", "Cloudflare may process IP, time, requested path, traffic volume, and routing data.", "connected"],
      ["External links", "Donation, support, and external sources open only when you choose them.", "connected"],
    ],
  },
  es: {
    title: "Resumen de privacidad",
    summary: "Leer y exportar artículos no entrega archivos personales a Holi. Cloudflare puede conocer tu IP y horario.",
    detailsLabel: "Detalles",
    facts: [
      ["Contenido", "Labs publica artículos estáticos y no solicita tus documentos locales.", "local"],
      ["Exportación", "Copiar resúmenes y generar Markdown o impresión ocurre en tu navegador.", "local"],
      ["Alojamiento", "Cloudflare puede procesar IP, horario, ruta solicitada, volumen y datos de enrutamiento.", "connected"],
      ["Enlaces externos", "Donaciones, soporte y fuentes externas sólo se abren cuando tú las eliges.", "connected"],
    ],
  },
  zh: {
    title: "隐私摘要",
    summary: "阅读和导出文章不会向 Holi 提交个人文件。Cloudflare 可能看到你的 IP 和访问时间。",
    detailsLabel: "详情",
    facts: [
      ["内容", "Labs 发布静态文章，不会请求你的本地文档。", "local"],
      ["导出", "复制摘要以及生成 Markdown 或打印输出均在浏览器中完成。", "local"],
      ["托管", "Cloudflare 可能处理 IP、时间、请求路径、流量和路由数据。", "connected"],
      ["外部链接", "捐赠、支持和外部来源只会在你主动选择时打开。", "connected"],
    ],
  },
  hi: {
    title: "गोपनीयता सारांश",
    summary: "लेख पढ़ने या निर्यात करने से आपकी निजी फ़ाइलें Holi को नहीं मिलतीं। Cloudflare आपका IP और पहुँच का समय देख सकता है।",
    detailsLabel: "विवरण",
    facts: [
      ["सामग्री", "Labs स्थिर लेख प्रकाशित करता है और आपके स्थानीय दस्तावेज़ नहीं माँगता।", "local"],
      ["निर्यात", "सारांश कॉपी करना और Markdown या प्रिंट आउटपुट बनाना आपके ब्राउज़र में होता है।", "local"],
      ["होस्टिंग", "Cloudflare IP, समय, अनुरोधित पथ, ट्रैफ़िक मात्रा और रूटिंग डेटा प्रोसेस कर सकता है।", "connected"],
      ["बाहरी लिंक", "दान, सहायता और बाहरी स्रोत केवल आपके चुनने पर खुलते हैं।", "connected"],
    ],
  },
  ar: {
    title: "ملخص الخصوصية",
    summary: "قراءة المقالات وتصديرها لا يرسل ملفاتك الشخصية إلى Holi. قد ترى Cloudflare عنوان IP ووقت الوصول.",
    detailsLabel: "التفاصيل",
    facts: [
      ["المحتوى", "تنشر Labs مقالات ثابتة ولا تطلب مستنداتك المحلية.", "local"],
      ["التصدير", "يحدث نسخ الملخصات وإنشاء Markdown أو مخرجات الطباعة داخل متصفحك.", "local"],
      ["الاستضافة", "قد تعالج Cloudflare عنوان IP والوقت والمسار المطلوب وحجم البيانات ومعلومات التوجيه.", "connected"],
      ["الروابط الخارجية", "لا تفتح روابط التبرع والدعم والمصادر الخارجية إلا عندما تختارها.", "connected"],
    ],
  },
  bn: {
    title: "গোপনীয়তার সারাংশ",
    summary: "লেখা পড়া বা এক্সপোর্ট করলে আপনার ব্যক্তিগত ফাইল Holi-এর কাছে যায় না। Cloudflare আপনার IP ও প্রবেশের সময় দেখতে পারে।",
    detailsLabel: "বিস্তারিত",
    facts: [
      ["কনটেন্ট", "Labs স্থির লেখা প্রকাশ করে এবং আপনার স্থানীয় ডকুমেন্ট চায় না।", "local"],
      ["এক্সপোর্ট", "সারাংশ কপি এবং Markdown বা প্রিন্ট আউটপুট তৈরি আপনার ব্রাউজারেই হয়।", "local"],
      ["হোস্টিং", "Cloudflare IP, সময়, অনুরোধ করা পথ, ট্রাফিকের পরিমাণ ও রাউটিং ডেটা প্রক্রিয়া করতে পারে।", "connected"],
      ["বাহ্যিক লিংক", "অনুদান, সহায়তা ও বাহ্যিক উৎসের লিংক শুধু আপনার পছন্দে খোলে।", "connected"],
    ],
  },
  pt: {
    title: "Resumo de privacidade",
    summary: "Ler e exportar artigos não envia arquivos pessoais à Holi. A Cloudflare pode observar seu IP e horário de acesso.",
    detailsLabel: "Detalhes",
    facts: [
      ["Conteúdo", "O Labs publica artigos estáticos e não solicita seus documentos locais.", "local"],
      ["Exportação", "Copiar resumos e gerar Markdown ou saída para impressão acontece no seu navegador.", "local"],
      ["Hospedagem", "A Cloudflare pode processar IP, horário, caminho solicitado, volume de tráfego e dados de roteamento.", "connected"],
      ["Links externos", "Doações, suporte e fontes externas só abrem quando você escolhe.", "connected"],
    ],
  },
} as const;

export function getLabsPrivacy(lang: string) {
  const locale = (lang in privacyByLang ? lang : "en") as LanguageCode;
  const copy = privacyByLang[locale];
  return {
    id: "labs-privacy",
    ...copy,
    facts: copy.facts.map(([label, value, tone]) => ({ label, value, tone })),
  };
}
