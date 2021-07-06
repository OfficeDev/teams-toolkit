/* eslint-disable @typescript-eslint/ban-ts-comment */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { TokenCacheContext } from "@azure/msal-node";
import { ConfigFolderName, ProductName } from "@microsoft/teamsfx-api";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as keytarType from "keytar";
import VsCodeLogInstance from "./log";
import * as os from "os";
import * as StringResources from "../resources/Strings.json";
import { env } from "vscode";

const cacheDir = os.homedir + `/.${ConfigFolderName}/account`;
const cachePath = os.homedir + `/.${ConfigFolderName}/account/token.cache.`;
const accountPath = os.homedir + `/.${ConfigFolderName}/account/homeId.cache.`;
const cachePathEnd = ".json";

export const UTF8 = "utf8";

// the recommended way to use keytar in vscode, https://code.visualstudio.com/api/advanced-topics/remote-extensions#persisting-secrets
declare const __webpack_require__: typeof require;
declare const __non_webpack_require__: typeof require;
function getNodeModule<T>(moduleName: string): T | undefined {
  const r = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
  try {
    return r(`${env.appRoot}/node_modules.asar/${moduleName}`);
  } catch (err) {
    // Not in ASAR.
  }
  try {
    return r(`${env.appRoot}/node_modules/${moduleName}`);
  } catch (err) {
    // Not available.
  }
  return undefined;
}

class AccountCrypto {
  private readonly algorithm: crypto.CipherGCMTypes = "aes-256-gcm";
  private readonly accountName: string;
  private readonly keytar?: typeof keytarType;

  constructor(accountName: string) {
    this.accountName = accountName;
    this.keytar = getNodeModule<typeof keytarType>("keytar");
  }

  public async encrypt(content: string): Promise<string> {
    const key = await this.getKey();
    if (key) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(content, UTF8), cipher.final()]);
      const tag = cipher.getAuthTag();
      return JSON.stringify({
        i: iv.toString("hex"),
        c: encrypted.toString("hex"),
        t: tag.toString("hex"),
      });
    } else {
      // no key, return plain text
      return content;
    }
  }

  public async decrypt(content: string): Promise<string> {
    const key = await this.getKey();
    if (key) {
      const object = JSON.parse(content);
      const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(object.i, "hex"));
      decipher.setAuthTag(Buffer.from(object.t, "hex"));
      const decrpyted = Buffer.concat([
        decipher.update(Buffer.from(object.c, "hex")),
        decipher.final(),
      ]);
      return decrpyted.toString(UTF8);
    } else {
      // no key, return plain text
      return content;
    }
  }

  private async getKey(): Promise<string | undefined> {
    try {
      if (this.keytar) {
        let key = await this.keytar.getPassword(ProductName, this.accountName);
        if (!key || key.length !== 32) {
          key = crypto.randomBytes(256).toString("hex").slice(0, 32);
          await this.keytar.setPassword(ProductName, this.accountName, key);

          // validate key again
          const savedKey = await this.keytar.getPassword(ProductName, this.accountName);
          if (savedKey === key) {
            return key;
          }
        } else {
          return key;
        }
      }
    } catch {
      // ignore keytar error
    }

    return undefined;
  }
}

export class CryptoCachePlugin {
  private readonly accountName: string;
  private readonly accountCrypto: AccountCrypto;

  constructor(accountName: string) {
    this.accountName = accountName;
    this.accountCrypto = new AccountCrypto(accountName);
  }

  public async beforeCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    await fs.ensureDir(cacheDir);
    const fileCachePath = this.getCachePath();
    if (await fs.pathExists(fileCachePath)) {
      try {
        const text = await fs.readFile(fileCachePath, UTF8);
        if (text && text.length > 0) {
          try {
            const data = await this.accountCrypto.decrypt(text);
            JSON.parse(data);
            cacheContext.tokenCache.deserialize(data);
          } catch (error) {
            await fs.writeFile(fileCachePath, "", UTF8);

            // still throw error if the plain text is not token cache
            let needThrow = true;
            try {
              const oldObj = JSON.parse(text);
              if (oldObj.Account) {
                needThrow = false;
              }
            } catch {
              // plain text format error
            }

            if (needThrow) {
              throw error;
            }
          }
        }
      } catch (err) {
        VsCodeLogInstance.error(StringResources.vsc.cacheAccess.readTokenFail + err.message);
      }
    } else {
      try {
        const data = cacheContext.tokenCache.serialize();
        const text = await this.accountCrypto.encrypt(data);
        await fs.writeFile(fileCachePath, text, UTF8);
      } catch (err) {
        VsCodeLogInstance.error(StringResources.vsc.cacheAccess.writeTokenFail + err.message);
      }
    }
  }

  public async afterCacheAccess(cacheContext: TokenCacheContext): Promise<void> {
    if (cacheContext.cacheHasChanged) {
      await fs.ensureDir(cacheDir);
      const fileCachePath = this.getCachePath();
      try {
        const data = cacheContext.tokenCache.serialize();
        const text = await this.accountCrypto.encrypt(data);
        await fs.writeFile(fileCachePath, text, UTF8);
      } catch (err) {
        VsCodeLogInstance.error(StringResources.vsc.cacheAccess.writeTokenFail + err.message);
      }
    }
  }

  private getCachePath() {
    return cachePath + this.accountName + cachePathEnd;
  }
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
