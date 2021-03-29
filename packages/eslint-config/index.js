module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    extends: [
        "plugin:@typescript-eslint/recommended"
    ],
    plugins: [
        "@typescript-eslint/eslint-plugin"
    ],
    rules: {
        quotes: ["error", "double", { "allowTemplateLiterals": true }],
        semi: ['error', 'always'],
    },
};