/* eslint-disable @typescript-eslint/ban-ts-comment */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ICachePlugin } from "@azure/msal-node";
import {
  DataProtectionScope,
  FilePersistence,
  FilePersistenceWithDataProtection,
  IPersistence,
  KeychainPersistence,
  LibSecretPersistence,
  PersistenceCachePlugin,
} from "@azure/msal-node-extensions";
import * as fs from "fs-extra";
import { ConfigFolderName, ProductName } from "@microsoft/teamsfx-api";
import * as os from "os";
import VsCodeLogInstance from "./log";

export const cacheDir = os.homedir + `/.${ConfigFolderName}/account`;
export const cachePath = os.homedir + `/.${ConfigFolderName}/account/token.cache.`;
export const accountPath = os.homedir + `/.${ConfigFolderName}/account/homeId.cache.`;
export const homeAccountId = "home_account_id";
export const UTF8 = "utf-8";
const cachePathEnd = ".json";
import * as StringResources from "../resources/Strings.json";

export function getBeforeCacheAccess(accountName: string) {
  //@ts-ignore
  const beforeCacheAccess = async (cacheContext): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      await fs.ensureDir(cacheDir);
      const fileCachePath = getCachePath(accountName);
      if (fs.existsSync(fileCachePath)) {
        fs.readFile(fileCachePath, UTF8, (err, data) => {
          try {
            JSON.parse(data);
          } catch (error) {
            fs.writeFileSync(fileCachePath, "", UTF8);
          }
          if (err) {
            VsCodeLogInstance.error(StringResources.vsc.cacheAccess.readTokenFail + err.message);
            reject();
          } else {
            cacheContext.tokenCache.deserialize(data);
            resolve();
          }
        });
      } else {
        fs.writeFile(fileCachePath, cacheContext.tokenCache.serialize(), (err) => {
          if (err) {
            VsCodeLogInstance.error(StringResources.vsc.cacheAccess.writeTokenFail + err.message);
            reject();
          }
        });
        resolve();
      }
    });
  };
  return beforeCacheAccess;
}

export function getAfterCacheAccess(scopes: string[], accountName: string) {
  //@ts-ignore
  const afterCacheAccess = async (cacheContext) => {
    if (cacheContext.cacheHasChanged) {
      const fileCachePath = getCachePath(accountName);
      // save token
      fs.writeFile(fileCachePath, cacheContext.tokenCache.serialize(), (err) => {
        if (err) {
          VsCodeLogInstance.error(StringResources.vsc.cacheAccess.saveTokenFail + err.message);
        }
      });

      // save home_account_id for later restore
      const data = JSON.parse(cacheContext.tokenCache.serialize());
      for (const key in data.AccessToken) {
        if (key.indexOf(scopes[0].toLowerCase()) != -1) {
          fs.writeFile(accountPath + accountName, data.AccessToken[key][homeAccountId], (err) => {
            if (err) {
              VsCodeLogInstance.error(
                StringResources.vsc.cacheAccess.saveHomeAccountIdFail + err.message
              );
            }
          });
        }
      }
    }
  };
  return afterCacheAccess;
}

export function getCachePath(accountName: string) {
  return cachePath + accountName + cachePathEnd;
}

export async function buildCachePlugin(accountName: string): Promise<ICachePlugin> {
  const persist = await createPersistence(accountName);
  return new PersistenceCachePlugin(persist);
}

export async function saveAccountId(accountName: string, accountId?: string) {
  await fs.ensureDir(cacheDir);
  try {
    if (accountId) {
      await fs.writeFile(accountPath + accountName, accountId, UTF8);
    } else {
      // this is to remove current account
      await fs.writeFile(accountPath + accountName, "", UTF8);
    }
  } catch (err) {
    VsCodeLogInstance.error(StringResources.vsc.cacheAccess.saveHomeAccountIdFail + err.message);
  }
}

export async function loadAccountId(accountName: string) {
  if (await fs.pathExists(accountPath + accountName)) {
    try {
      return await fs.readFile(accountPath + accountName, UTF8);
    } catch (err) {
      VsCodeLogInstance.error(StringResources.vsc.cacheAccess.readHomeAccountIdFail + err.message);
    }
  }

  return undefined;
}

export async function resetPersistence(accountName: string) {
  await fs.ensureDir(cacheDir);
  const cachePath = getCachePath(accountName);
  await fs.writeFile(cachePath, "", UTF8);
}

async function createPersistence(accountName: string): Promise<IPersistence> {
  let persistence: IPersistence | undefined = undefined;
  const cachePath = getCachePath(accountName);

  try {
    // On Windows, uses a DPAPI encrypted file
    if (process.platform === "win32") {
      persistence = await FilePersistenceWithDataProtection.create(
        cachePath,
        DataProtectionScope.CurrentUser
      );
    }

    // On Mac, uses keychain.
    if (process.platform === "darwin") {
      persistence = await KeychainPersistence.create(cachePath, ProductName, accountName);
    }

    // On Linux, uses  libsecret to store to secret service. Libsecret has to be installed.
    if (process.platform === "linux") {
      persistence = await LibSecretPersistence.create(cachePath, ProductName, accountName);
    }

    if (persistence && !(await persistence.verifyPersistence())) {
      persistence = undefined;
    }
  } catch {
    // error when creating persistence
    persistence = undefined;
  }

  // fall back to plain text
  if (!persistence) {
    persistence = await FilePersistence.create(cachePath);
  }

  try {
    // verify content again
    JSON.parse((await persistence.load()) + "");
  } catch (error) {
    // reset if incorrect content
    await resetPersistence(accountName);
  }

  return persistence!;
}
