// Brand logos are generated from plain path data so the centered QR logo
// never depends on a black monochrome source SVG or inherited fill rules.

export const BRAND_PATHS = {
    facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    twitter: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    bitcoin: 'M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z',
    apple: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
    playstore: 'M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z',
    wifi: 'M12 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4.24-4.24l1.41 1.41C10.07 14.29 11 14 12 14s1.93.29 2.83.88l1.41-1.41C14.9 12.52 13.5 12 12 12s-2.9.52-4.24 1.76zm-2.83-2.83l1.41 1.41C8.11 10.59 9.97 10 12 10s3.89.59 5.66 1.76l1.41-1.41C16.82 8.58 14.53 8 12 8s-4.82.58-7.07 2.93z',
} as const;

export const BRAND_COLORS = {
    facebook: '#1877F2',
    twitter: '#000000',
    youtube: '#FF0000',
    bitcoin: '#F7931A',
    appstore: '#000000',
    playstore: '#000000',
    wifi: '#000000',
} as const;

const PATH_BY_TYPE: Record<string, string> = {
    ...BRAND_PATHS,
    appstore: BRAND_PATHS.apple,
};

function normalizeColor(color: string): string {
    if (color === 'white') return '#FFFFFF';
    if (color === 'black') return '#000000';
    return color;
}

function svgToDataUri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BRAND_SVG_SIZE = 1024;

function createBrandSvg(path: string, color: string): string {
    const fill = normalizeColor(color);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${BRAND_SVG_SIZE}" height="${BRAND_SVG_SIZE}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"><path d="${path}" fill="${fill}" shape-rendering="geometricPrecision"/></svg>`;
}

function createBrandLogo(type: string, color: string): string {
    const path = PATH_BY_TYPE[type];
    return svgToDataUri(createBrandSvg(path, color));
}

export const BRAND_LOGOS = {
    facebook: createBrandLogo('facebook', BRAND_COLORS.facebook),
    twitter: createBrandLogo('twitter', BRAND_COLORS.twitter),
    youtube: createBrandLogo('youtube', BRAND_COLORS.youtube),
    bitcoin: createBrandLogo('bitcoin', BRAND_COLORS.bitcoin),
    appstore: createBrandLogo('appstore', BRAND_COLORS.appstore),
    playstore: createBrandLogo('playstore', BRAND_COLORS.playstore),
    wifi: createBrandLogo('wifi', BRAND_COLORS.wifi),
} as Record<string, string>;

export const BRAND_ICONS = {
    facebook: createBrandLogo('facebook', '#FFFFFF'),
    twitter: createBrandLogo('twitter', '#FFFFFF'),
    youtube: createBrandLogo('youtube', '#FFFFFF'),
    bitcoin: createBrandLogo('bitcoin', '#FFFFFF'),
    appstore: createBrandLogo('appstore', '#FFFFFF'),
    playstore: createBrandLogo('playstore', '#FFFFFF'),
    wifi: createBrandLogo('wifi', '#FFFFFF'),
} as Record<string, string>;

export const getTypeLogo = (type: string) => {
    return BRAND_LOGOS[type] || undefined;
};

export const getTypeIcon = (type: string) => {
    return BRAND_ICONS[type] || undefined;
};

export const getColorizedTypeLogo = (type: string, color: string) => {
    if (!PATH_BY_TYPE[type]) return undefined;
    return createBrandLogo(type, color);
};
