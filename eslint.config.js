import tseslint from "typescript-eslint";

const LINTED_FILES = ["src/**/*.ts"];

export default tseslint.config(
  {
    extends: [...tseslint.configs.recommended],
    files: LINTED_FILES,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      // `lib: ["DOM"]` is in tsconfig for one type — the WHATWG `URL`. It also
      // brings the browser globals into scope, and this package is imported by
      // Cloudflare Workers where they do not exist. Blocking them here keeps
      // the lib from becoming a licence to use it.
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "navigator",
          "localStorage",
          "sessionStorage",
          "history",
          "location",
          "alert"
        ].map((name) => ({
          name,
          message: `${name} is a browser global; this package must run unchanged in a Worker.`
        }))
      ],
      // The package's whole promise is that importing it commits a consumer to
      // nothing. `scripts/verify-exports.mjs` enforces that on the built output
      // at publish time; this catches it at the keystroke instead.
      //
      // Allowed: relative imports, and `vitest` — which specs need and which
      // never reaches `dist/`, since `tsconfig.build.json` excludes them.
      // Everything else is a dependency by another name.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\.\\.?/)(?!vitest$).+",
              message:
                "@loopingai/a2a-protocol has no dependencies — a bare import " +
                "here would make every consumer install one. See README.md, " +
                "'Zero dependencies is enforced, not promised'."
            }
          ]
        }
      ]
    }
  },
  {
    // Type-aware pass — enables @deprecated detection without switching the
    // whole config to recommendedTypeChecked and its stricter rule set.
    files: LINTED_FILES,
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error"
    }
  },
  {
    ignores: ["dist/", "node_modules/"]
  }
);
