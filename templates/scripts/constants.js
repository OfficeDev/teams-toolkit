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

const RegExps = {
  AllPlaceholders: /(?<!\$){{(?!\/).*?}}/g,
  AllMustacheDelimiters: /[{#}]/g,
  SchemaVersion:
    /(https:\/\/aka.ms\/teams-toolkit\/)([v0-9.]+)(\/yaml.schema.json)(\s*.*\s*.*\s*version: )([v0-9.]+)/,
  SchemaVersionReplacement: (newVersion) => `$1${newVersion}$3$4${newVersion}`,
};

module.exports = {
  Ext,
  Path,
  RegExps,
};
