// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const axios = require("axios");
const semver = require("semver");
const process = require("process");
const fs = require("fs-extra");
const path = require("path");
const config = require("../src/common/templates-config.json");

const stdin = process.stdin;

const languages = ["js", "ts"];
const templates = [
  ["function-base", "default", "function"],
  ["function-triggers", "HTTPTrigger", "function"],
  ["tab", "default", "frontend"],
  ["bot", "default", "bot"],
  ["msgext", "default", "bot"],
  ["bot-msgext", "default", "bot"],
];

let stepId = 0;

async function step(desc, fn) {
  const id = ++stepId;
  try {
    console.log(`step ${id} start: ${desc}`);
    const ret = await fn();
    return ret;
  } catch (e) {
    console.log(e.toString());
    console.log(`step ${id} failed`);
    process.exit(-1);
  }
}

async function downloadLatestTemplates(rawTagList) {
  const tagList = rawTagList.toString().replace(/\r/g, "").split("\n");
  const versionList = tagList
    .filter((tag) => tag.startsWith(config.tagPrefix))
    .map((tag) => tag.replace(config.tagPrefix, ""));
  const selectedVersion = semver.maxSatisfying(versionList, config.version);
  if (!selectedVersion) {
    console.error(`Failed to find a tag for the version, ${config.version}`);
    process.exit(-1);
  }

  const tag = config.tagPrefix + selectedVersion;
  for (let lang of languages) {
    for (let template of templates) {
      const fileName = `${template[0]}.${lang}.${template[1]}.zip`;
      step(`Download ${config.templateDownloadBaseURL}/${tag}/${fileName}`, async () => {
        const res = await axios.get(`${config.templateDownloadBaseURL}/${tag}/${fileName}`, {
          responseType: "arraybuffer",
        });
        const folder = path.join(__dirname, "..", "templates", "plugins", "resource", template[2]);
        await fs.ensureDir(folder);
        await fs.writeFile(path.join(folder, `${fileName}`), res.data);
      });
    }
  }
}

function main() {
  tags = "";
  stdin.on("readable", () => {
    let data = stdin.read();
    if (data) {
      tags += data;
    }
  });
  stdin.on("end", () => {
    downloadLatestTemplates(tags);
  });
}

main();
