module.exports = {
  extends: ["../eslint-config"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "import/no-unresolved": "off",
    "import/no-cycle": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "no-secrets/no-secrets": "off",
  },
};
