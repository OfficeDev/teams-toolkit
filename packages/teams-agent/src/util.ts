import axios, { AxiosResponse, CancelToken } from "axios";
import * as fs from "fs-extra";
import { EOL } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { SampleUrlInfo } from "./sample";

export async function sendRequestWithTimeout<T>(
  requestFn: (cancelToken: CancelToken) => Promise<AxiosResponse<T>>,
  timeoutInMs: number,
  tryLimits = 1
): Promise<AxiosResponse<T>> {
  const source = axios.CancelToken.source();
  const timeout = setTimeout(() => {
    source.cancel();
  }, timeoutInMs);
  try {
    const res = await sendRequestWithRetry(() => requestFn(source.token), tryLimits);
    clearTimeout(timeout);
    return res;
  } catch (err: unknown) {
    if (axios.isCancel(err)) {
      throw new Error("Request timeout");
    }
    throw err;
  }
}

async function sendRequestWithRetry<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  tryLimits: number
): Promise<AxiosResponse<T>> {
  // !status means network error, see https://github.com/axios/axios/issues/383
  const canTry = (status: number | undefined) => !status || (status >= 500 && status < 600);

  let status: number | undefined;
  let error: Error;

  for (let i = 0; i < tryLimits && canTry(status); i++) {
    try {
      const res = await requestFn();
      if (res.status === 200 || res.status === 201) {
        return res;
      } else {
        error = new Error(`HTTP Request failed: ${JSON.stringify(res)}`);
      }
      status = res.status;
    } catch (e: any) {
      error = e;
      status = e?.response?.status;
    }
  }

  error ??= new Error(`RequestWithRetry got bad tryLimits: ${tryLimits}`);
  throw error;
}

type SampleFileInfo = {
  tree: {
    path: string;
    type: string;
  }[];
  sha: string;
};

export async function getSampleFileInfo(urlInfo: SampleUrlInfo, retryLimits: number): Promise<any> {
  const fileInfoUrl = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repository}/git/trees/${urlInfo.ref}?recursive=1`;
  const fileInfo = (
    await sendRequestWithRetry(async () => {
      return await axios.get(fileInfoUrl);
    }, retryLimits)
  ).data as SampleFileInfo;

  const samplePaths = fileInfo?.tree
    ?.filter((node) => node.path.startsWith(`${urlInfo.dir}/`) && node.type !== "tree")
    .map((node) => node.path);
  const fileUrlPrefix = `https://raw.githubusercontent.com/${urlInfo.owner}/${urlInfo.repository}/${fileInfo?.sha}/`;
  return { samplePaths, fileUrlPrefix };
}

export async function downloadSampleFiles(
  fileUrlPrefix: string,
  samplePaths: string[],
  dstPath: string,
  relativePath: string,
  retryLimits: number,
  concurrencyLimits: number
): Promise<void> {
  const downloadCallback = async (samplePath: string) => {
    const file = (await sendRequestWithRetry(async () => {
      return await axios.get(fileUrlPrefix + samplePath, { responseType: "arraybuffer" });
    }, retryLimits)) as unknown as any;
    const filePath = path.join(dstPath, path.relative(`${relativePath}/`, samplePath));
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, Buffer.from(file.data));
  };
  await runWithLimitedConcurrency(samplePaths, downloadCallback, concurrencyLimits);
}

export function detectExtensionInstalled(extensionId: string): boolean {
  const res = vscode.extensions.getExtension(extensionId);
  return res !== undefined;
}

async function runWithLimitedConcurrency<T>(
  items: T[],
  callback: (arg: T) => any,
  concurrencyLimit: number
): Promise<void> {
  const queue: any[] = [];
  for (const item of items) {
    // fire the async function, add its promise to the queue, and remove
    // it from queue when complete
    const p = callback(item)
      .then((res: any) => {
        queue.splice(queue.indexOf(p), 1);
        return res;
      })
      .catch((err: any) => {
        throw err;
      });
    queue.push(p);
    // if max concurrent, wait for one to finish
    if (queue.length >= concurrencyLimit) {
      await Promise.race(queue);
    }
  }
  // wait for the rest of the calls to finish
  await Promise.all(queue);
}

export function getTeamsApps(folders?: readonly vscode.WorkspaceFolder[]): string[] | undefined {
  const teamsApps = folders?.map(folder => folder.uri.fsPath).filter(p => isValidProjectV3(p));
  return teamsApps;
}

export const MetadataV3 = {
  projectVersion: "1.0.0",
  unSupprotVersion: "2.0.0",
  platformVersion: {
    vs: "17.5.x.x",
    vsc: "5.x.x",
    cli: "2.x.x",
    cli_help: "2.x.x",
  },
  configFile: "teamsapp.yml",
  localConfigFile: "teamsapp.local.yml",
  testToolConfigFile: "teamsapp.testtool.yml",
  defaultEnvironmentFolder: "env",
  envFilePrefix: ".env",
  secretFileSuffix: "user",
  projectId: "projectId",
  teamsManifestFolder: "appPackage",
  teamsManifestFileName: "manifest.json",
  aadManifestFileName: "aad.manifest.json",
  v3UpgradeWikiLink: "https://aka.ms/teams-toolkit-5.0-upgrade",
  secretFileComment:
    "# This file includes environment variables that will not be committed to git by default. You can set these environment variables in your CI/CD system for your project." +
    EOL,
  secretComment:
    "# Secrets. Keys prefixed with `SECRET_` will be masked in Teams Toolkit logs." + EOL,
  envFileDevComment:
    "# This file includes environment variables that will be committed to git by default." + EOL,
  envFileLocalComment:
    "# This file includes environment variables that can be committed to git. It's gitignored by default because it represents your local development environment." +
    EOL,
};

export function isValidProjectV3(workspacePath: string): boolean {
  const ymlFilePath = path.join(workspacePath, MetadataV3.configFile);
  const localYmlPath = path.join(workspacePath, MetadataV3.localConfigFile);
  if (fs.pathExistsSync(ymlFilePath) || fs.pathExistsSync(localYmlPath)) {
    return true;
  }
  return false;
}
