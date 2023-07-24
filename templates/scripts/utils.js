const path = require("path");
const { readdirSync, lstatSync, existsSync } = require("node:fs");
const Mustache = require("mustache");

function filterFiles(dir, fileList = [], filter = () => true) {
  if (!existsSync(dir)) {
    return fileList;
  }
  const files = readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (lstatSync(filePath).isDirectory()) {
      fileList = filterFiles(filePath, fileList, filter);
    } else if (filter(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function filterYmlFiles(dir, fileList = []) {
  return filterFiles(dir, fileList, (file) => file.endsWith(".yml"));
}

function filterMustacheFiles(dir, fileList = []) {
  return filterFiles(dir, fileList, (file) => file.endsWith(".mustache"));
}

function escapeEmptyVariable(template, view, tags = ["{{", "}}"]) {
  const parsed = Mustache.parse(template, tags);
  let tokens = JSON.parse(JSON.stringify(parsed)); // deep copy
  for (const v of tokens) {
    if (v[0] === "name" && !view[v[1]]) {
      v[0] = "text";
      v[1] = tags[0] + v[1] + tags[1];
    }
  }
  return tokens;
}

function renderMustache(template, view) {
  const token = escapeEmptyVariable(template, view);
  const writer = new Mustache.Writer();
  return writer.renderTokens(token, new Mustache.Context(view), undefined, template);
}

module.exports = {
  filterYmlFiles,
  filterMustacheFiles,
  renderMustache,
};
