const { resolve } = require("node:path");

const Ext = {
  Yml: ".yml",
  Mustache: ".mustache",
  YmlTpl: ".yml.tpl",
  Json: ".json",
};

const Path = {
  YmlConstraints: resolve(__dirname, "..", "constraints", "yml", "templates"),
  YmlSnippets: resolve(__dirname, "..", "constraints", "yml", "actions"),
  Solution: resolve(__dirname, ".."),
};

const RegExp = {
  AllPlaceholders: /(?<!\$){{(?!\/).*?}}/g,
  AllMustacheDelimiters: /[{#}]/g,
};

module.exports = {
  Ext,
  Path,
  RegExp,
};
