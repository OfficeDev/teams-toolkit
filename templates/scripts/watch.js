const { writeFileSync, readFileSync, accessSync, watch, rm } = require("node:fs");
const { join, basename } = require("node:path");
const utils = require("./utils");
const Mustache = require("mustache");
const { Ext, Path } = require("./constants");

const snippetsFolder = Path.YmlSnippets;

const ac = new AbortController();
let tempFiles = [];

function cleanup() {
  ac.abort();
  try {
    tempFiles.forEach((file) => {
      console.log(`Deleting ${file}`);
      rm(file, { force: true }, (error) => {
        if (error) {
          console.log(error.message);
        }
      });
    });
  } catch {}
}

function writeTempFile(filepath, content) {
  if (!tempFiles.includes(filepath)) {
    tempFiles.push(filepath);
  }
  writeFileSync(filepath, content);
}

function parseTokens(tokens, result = {}) {
  for (const v of tokens) {
    if (v[0] === "name") {
      result[v[1]] = v[1];
    }
    if (v[0] === "#" && !result[v[1]]) {
      result[v[1]] = true;
      result = { ...result, ...parseTokens(v[4], result) };
    }
  }
  return result;
}

function renderVariablesFromTemplates(template) {
  const parsed = Mustache.parse(template);
  let tokens = JSON.parse(JSON.stringify(parsed)); // deep copy
  return parseTokens(tokens);
}

function loadVariables(varFile, template) {
  // load variables from json file if exists
  try {
    accessSync(varFile);
    return JSON.parse(readFileSync(varFile, "utf8"));
  } catch (e) {
    if (e.name === "SyntaxError") {
      console.log(e.message);
      return {};
    }
  }
  // render variables from mustache template if json file does not exist
  const variables = renderVariablesFromTemplates(template);
  writeTempFile(varFile, JSON.stringify(variables, null, 2));
  return variables;
}

function previewMustache(mustacheName, dir = snippetsFolder) {
  const mustacheFile = join(dir, `${mustacheName}${Ext.Mustache}`);
  const varFile = join(dir, `${mustacheName}${Ext.Json}`);
  const ymlFile = join(dir, `${mustacheName}${Ext.Yml}`);

  const template = readFileSync(mustacheFile, "utf8");
  if (!template) {
    return;
  }
  const variables = loadVariables(varFile, template);

  const rendered = utils.renderMustache(template, variables);
  writeTempFile(ymlFile, rendered);
}

function handler(eventType, filename) {
  if (eventType === "change") {
    if (filename?.endsWith(Ext.Mustache)) {
      const mustacheName = basename(filename, Ext.Mustache);
      previewMustache(mustacheName);
    }
    if (filename?.endsWith(Ext.Json)) {
      const mustacheName = basename(filename, Ext.Json);
      previewMustache(mustacheName);
    }
  }
}

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function main() {
  try {
    console.log(`Watching ${snippetsFolder}`);
    watch(
      snippetsFolder,
      { persistent: true, encoding: "utf8", signal: ac.signal, recursive: false },
      // fs.watch could be triggered twice for a single file change, delay the event handler to avoid duplicate rendering
      debounce(handler, 100)
    );
  } catch (err) {
    console.error(err);
  }

  process.on("SIGINT", cleanup); // CTRL+C
}

main();
