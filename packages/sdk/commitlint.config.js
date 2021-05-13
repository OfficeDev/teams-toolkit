module.exports = {
  extends: ["@commitlint/config-conventional"],
  "type-enum": [2, "always", ["chore", "docs", "feat", "fix", "refactor", "style", "test"]],
  "scope-empty": [2, "never"],
};
