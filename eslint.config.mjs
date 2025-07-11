import eslint from "@electron-toolkit/eslint-config";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
    { ignores: ["**/node_modules", "**/dist", "**/out"] },
    eslint,
    eslintPluginReact.configs.flat.recommended,
    eslintPluginReact.configs.flat["jsx-runtime"],
    {
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    {
        files: ["**/*.{js,jsx}"],
        plugins: {
            "react-hooks": eslintPluginReactHooks,
            "react-refresh": eslintPluginReactRefresh,
            prettier: eslintPluginPrettier,
        },
        rules: {
            ...eslintPluginReactHooks.configs.recommended.rules,
            ...eslintPluginReactRefresh.configs.vite.rules,
            "react/prop-types": "off",
            "prettier/prettier": [
                "error",
                {
                    arrowParens: "always",
                    semi: true,
                    trailingComma: "es5",
                    tabWidth: 4,
                    endOfLine: "auto",
                    useTabs: false,
                    singleQuote: false,
                    printWidth: 80,
                },
            ],
        },
    },
];
