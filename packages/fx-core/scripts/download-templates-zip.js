// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const axios = require("axios");
const semver = require("semver");
const process = require("process");
const fs = require("fs-extra");
const path = require("path");
const config = require("../src/common/templates-config.json");

const templatePath = process.env.TEMPLATE_PATH;
const fallbackPath = path.join(__dirname, "..", "templates", "fallback");

const token = process.env.REQUEST_TOKEN;
const defaultOptions = {
  headers: token
    ? {
        authorization: `Bearer ${token}`,
      }
    : {},
};
const axiosInstance = axios.create(defaultOptions);

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

async function retry(id, fn, retryIntervalInMs = 5000, maxAttempts = 5) {
  const execute = async (attempt) => {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxAttempts) {
        // Increase retry interval for each failure
        const delayInMs = retryIntervalInMs * attempt;
        console.log(e.toString());
        console.log(`step ${id} failed, retrying after ${delayInMs} milliseconds.`);
        return delay(() => execute(attempt + 1), delayInMs);
      }
      throw e;
    }
  };
  return execute(1);
}

function delay(fn, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), ms));
}

function getTemplateDownloadPathPattern(tag) {
  const path = `${config.templateDownloadBasePath}/${encodeURIComponent(tag)}/`;
  const pattern = `${path}(.*)${config.templateExt}`;
  return new RegExp(pattern, "g");
}

// Parse all template names from html instead of requesting /repos/{owner}/{repo}/releases/tags/{tag}.
// Because API request to GitHub are subject to rate limits.
async function getTemplates(tag) {
  const pattern = getTemplateDownloadPathPattern(tag);
  const url = `${config.templateReleaseURL}/${tag}`;
  return await step(`Download release metadata from ${url}`, async () => {
    const res = await axiosInstance.get(url);
    return [...res.data.matchAll(pattern)].map((match) => match[1]);
  });
}

async function downloadTemplates(version) {
  const tag = config.tagPrefix + version;
  console.log(`Start to download templates with tag: ${tag}`);

  await fs.ensureDir(fallbackPath);

  const templates = await getTemplates(tag);
  for (let template of templates) {
    const filename = `${template}${config.templateExt}`;
    step(`Download ${config.templateDownloadBaseURL}/${tag}/${filename}`, async () => {
      const res = await axiosInstance.get(`${config.templateDownloadBaseURL}/${tag}/${filename}`, {
        responseType: "arraybuffer",
      });
      await fs.writeFile(path.join(fallbackPath, `${filename}`), res.data);
    });
  }
}

function selectVersion(tagList) {
  if (semver.prerelease(config.version)) {
    return config.version;
  }
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
    const res = await axiosInstance.get(config.tagListURL);
    return res.data;
  });
  const tagList = rawTagList.toString().replace(/\r/g, "").split("\n");
  return selectVersion(tagList);
}

async function copyTemplateFromLocal(templatePath) {
  templatePath.split(";").forEach((path) => {
    console.log(`Start to copy templates from ${path} to ${fallbackPath}`);
    fs.copySync(path, fallbackPath);
  });
}

async function main() {
  if (templatePath) {
    await copyTemplateFromLocal(templatePath);
    return;
  }
  const selectedVersion =
    selectVersionFromShellArgument() || (await selectVersionFromRemoteTagList());
  if (!selectVersion) {
    console.error(`Failed to find a tag for the version, ${config.version}`);
    process.exit(-1);
  }
  await downloadTemplates(selectedVersion);
}

main();
