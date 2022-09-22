// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const axios = require("axios");
const semver = require("semver");
const process = require("process");
const fs = require("fs-extra");
const path = require("path");
const config = require("../src/common/templates-config.json");

let stepId = 0;

async function step(desc, fn) {
  const id = ++stepId;
  try {
    console.log(`step ${id} start: ${desc}`);
    const ret = await retry(id, fn);
    return ret;
  } catch (e) {
    console.log(e.toString());
    console.log(`step ${id} failed`);
    process.exit(-1);
  }
}

async function retry(id, fn, retryIntervalInMs = 5000, maxAttemptCount = 5) {
  let exception = undefined;
  for (let attempted = 0; attempted < maxAttemptCount; ++attempted) {
    try {
      if (attempted > 0) {
        // Increase the retry interval for each failure.
        await sleep(retryIntervalInMs * attempted);
      }
      return await fn();
    } catch (e) {
      console.log(e.toString());
      console.log(`step ${id} failed, retrying ${attempted}.`);
      exception = e;
    }
  }
  if (exception) {
    throw exception;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTemplateMetadata(tag) {
  const url = `${config.templateReleaseURL}/${tag}`;
  return await step(`Download release metadata from ${url}`, async () => {
    const res = await axios.get(url);
    return res.data.assets;
  });
}

async function downloadTemplates(version) {
  const tag = config.tagPrefix + version;
  console.log(`Start to download templates with tag: ${tag}`);

  const folder = path.join(__dirname, "..", "templates", "fallback");
  await fs.ensureDir(folder);

  const templates = await getTemplateMetadata(tag);
  for (let template of templates) {
    const filename = template.name;
    step(`Download ${config.templateDownloadBaseURL}/${tag}/${filename}`, async () => {
      const res = await axios.get(`${config.templateDownloadBaseURL}/${tag}/${filename}`, {
        responseType: "arraybuffer",
      });
      await fs.writeFile(path.join(folder, `${filename}`), res.data);
    });
  }
}

function selectVersion(tagList) {
  const versionList = tagList
    .filter((tag) => tag.startsWith(config.tagPrefix))
    .map((tag) => tag.replace(config.tagPrefix, ""));
  return semver.maxSatisfying(versionList, config.version);
}

function selectVersionFromShellArgument() {
  const tagList = process.argv.slice(2);
  return selectVersion(tagList);
}

async function selectVersionFromRemoteTagList() {
  const rawTagList = await step(`Download tag list from ${config.tagListURL}`, async () => {
    const res = await axios.get(config.tagListURL);
    return res.data;
  });
  const tagList = rawTagList.toString().replace(/\r/g, "").split("\n");
  return selectVersion(tagList);
}

async function main() {
  const selectedVersion =
    selectVersionFromShellArgument() || (await selectVersionFromRemoteTagList());
  if (!selectVersion) {
    console.error(`Failed to find a tag for the version, ${config.version}`);
    process.exit(-1);
  }
  await downloadTemplates(selectedVersion);
}

main();
