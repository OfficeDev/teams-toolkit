// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { TokenCacheContext } from "@azure/msal-node";
import { ConfigFolderName, ProductName } from "@microsoft/teamsfx-api";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as keytar from "keytar";
import VsCodeLogInstance from "./log";
import * as os from "os";

const cacheDir = os.homedir + `/.${ConfigFolderName}/account`;
const cachePath = os.homedir + `/.${ConfigFolderName}/account/token.cache.`;
const accountPath = os.homedir + `/.${ConfigFolderName}/account/homeId.cache.`;
const cachePathEnd = ".json";

export const UTF8 = "utf8";

class AccountCrypto {
  private readonly algorithm: crypto.CipherGCMTypes = "aes-256-gcm";
  private readonly accountName: string;

  constructor(accountName: string) {
    this.accountName = accountName;
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
      let key = await keytar.getPassword(ProductName, this.accountName);
      if (!key || key.length !== 32) {
        key = crypto.randomBytes(256).toString("hex").slice(0, 32);
        await keytar.setPassword(ProductName, this.accountName, key);

        // validate key again
        const savedKey = await keytar.getPassword(ProductName, this.accountName);
        if (savedKey === key) {
          return key;
        }
      } else {
        return key;
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
        VsCodeLogInstance.error("read token fail: " + err.message);
      }
    } else {
      try {
        const data = cacheContext.tokenCache.serialize();
        const text = await this.accountCrypto.encrypt(data);
        await fs.writeFile(fileCachePath, text, UTF8);
      } catch (err) {
        VsCodeLogInstance.error("write token fail: " + err.message);
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
        VsCodeLogInstance.error("save token fail: " + err.message);
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
    VsCodeLogInstance.error("save home account id fail: " + err.message);
  }
}

export async function loadAccountId(accountName: string) {
  if (await fs.pathExists(accountPath + accountName)) {
    try {
      return await fs.readFile(accountPath + accountName, UTF8);
    } catch (err) {
      VsCodeLogInstance.error("read home account id fail: " + err.message);
    }
  }

  return undefined;
}
