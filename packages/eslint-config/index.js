module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
    },
    extends: [
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript"
    ],
    plugins: [
        "@typescript-eslint/eslint-plugin",
        "prettier",
    ],
    rules: {
        'prettier/prettier': 'error',
        quotes: ["error", "double", { "allowTemplateLiterals": true, "avoidEscape": true }],
        semi: ["error", "always"],
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/no-empty-function': 0,
        "import/no-cycle": [
            "warn",
            {
                "maxDepth": Infinity,
                "ignoreExternal": true
            }
        ],
        "import/no-unresolved": [
            "warn"
        ]
    },
};
