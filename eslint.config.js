import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/pkg/**",
      "**/pkg-node/**",
      "**/target/**",
      "**/node_modules/**",
      "**/.astro/**",
      "**/.wrangler/**",
      "web/apps/**/scripts/**",
      "web/apps/**/test-output/**",
      "local/mcp/test-output/**",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "no-case-declarations": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-undef": "off", // TypeScript handles this better
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
    },
  }
);
