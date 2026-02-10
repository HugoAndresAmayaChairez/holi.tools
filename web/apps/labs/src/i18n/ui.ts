export const ui = {
    en: {
        meta_title: "Holi Labs - Experimental",
        meta_description: "Bleeding edge research, WebGPU experiments, and technical papers.",
        hero_slogan: "Bleeding edge research & experiments.",
        coming_soon: "Coming Soon",
        back_home: "Back to Holi.tools",
        experiments_title: "Active Experiments",
        exp_shader_title: "WebGPU Shader",
        exp_shader_desc: "Real-time background rendering using wgpu-compatible pipelines.",
        exp_qr_title: "QR Core Logic",
        exp_qr_desc: "Technical dive into high-performance QR generation in Rust.",
        exp_perf_title: "Performance",
        exp_perf_desc: "Benchmarking WASM against native JavaScript implementation.",
        search_placeholder: "filter experiments...",
    },
    es: {
        meta_title: "Holi Labs - Experimental",
        meta_description: "Investigación de vanguardia, experimentos WebGPU y papers técnicos.",
        hero_slogan: "Investigación y experimentos de vanguardia.",
        coming_soon: "Próximamente",
        back_home: "Volver a Holi.tools",
        experiments_title: "Experimentos Activos",
        exp_shader_title: "Shader WebGPU",
        exp_shader_desc: "Renderizado de fondo en tiempo real usando pipelines compatibles con wgpu.",
        exp_qr_title: "Lógica QR Core",
        exp_qr_desc: "Inmersión técnica en la generación de QR de alto rendimiento en Rust.",
        exp_perf_title: "Rendimiento",
        exp_perf_desc: "Benchmarking de WASM frente a implementaciones en JavaScript nativo.",
        search_placeholder: "filtrar experimentos...",
    },
} as const;

export type TranslationKey = keyof (typeof ui)["en"];
