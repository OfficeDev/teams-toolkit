// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountManager } from "../../../src/commonlib/azureLogin";
import {
  AccountCrypto,
  AzureSpCrypto,
  clearCache,
  CryptoCachePlugin,
  loadAccountId,
} from "../../../src/commonlib/cacheAccess";
import { expect } from "../utils";
import fs, { WriteFileOptions } from "fs-extra";
import sinon from "sinon";

class MockKeytar {
  public async getPassword(service: string, account: string): Promise<string | null> {
    return Promise.resolve("1234567890abcdefghijklmnopqrstuv");
  }

  public async setPassword(service: string, account: string, password: string): Promise<void> {
    return Promise.resolve();
  }

  public async deletePassword(service: string, account: string): Promise<boolean> {
    throw new Error("Not Supported");
  }

  public async findPassword(service: string): Promise<string | null> {
    throw new Error("Not Supported");
  }

  public async findCredentials(
    service: string
  ): Promise<Array<{ account: string; password: string }>> {
    throw new Error("Not Supported");
  }
}

describe("AccountCrypto Tests", function () {
  // nothing to do with the test logic, but to avoid weird type error. (https://stackoverflow.com/questions/68051262/)
  const azureAccountManager = AzureAccountManager.getInstance();
  const cachePlugin = new CryptoCachePlugin("test");

  it("Encrypt/Decrypt Content", async () => {
    const accountCrypto = new AccountCrypto("test");
    (<any>accountCrypto).keytar = new MockKeytar();

    const content =
      '{"clientId":"clientId","secret":"secret","tenantId":"3c8f28dd-b990-4925-96a6-3ea9495654b8"}';
    const encrypted = await accountCrypto.encrypt(content);
    expect(encrypted.includes(content)).to.be.false;
    const decrtpyed = await accountCrypto.decrypt(encrypted);
    expect(decrtpyed).equals(content);
  });

  it("Encrypt/Decrypt Content - Unknown key", async () => {
    const accountCrypto = new AccountCrypto("test");
    (<any>accountCrypto).keytar = new MockKeytar();
    (<any>accountCrypto).keytar.getPassword = Promise.reject();

    const content =
      '{"clientId":"clientId","secret":"secret","tenantId":"3c8f28dd-b990-4925-96a6-3ea9495654b8"}';
    const noEncrypted = await accountCrypto.encrypt(content);
    expect(noEncrypted).to.be.eq(content);
    const noDecrtpyed = await accountCrypto.decrypt(content);
    expect(noDecrtpyed).to.be.eq(content);
  });
});

describe("AccountCrypto Service principal Tests", function () {
  const sandbox = sinon.createSandbox();

  before(() => {
    sandbox.stub(fs, "ensureDir").callsFake(async (path: fs.PathLike) => {
      return true;
    });
    sandbox
      .stub(fs, "writeFile")
      .callsFake(async (folder: any, content: string, options?: WriteFileOptions | string) => {
        return;
      });
    sandbox.stub(fs, "remove").callsFake(async (path: fs.PathLike) => {
      return;
    });
    sandbox.stub(fs, "pathExists").callsFake(async (path: fs.PathLike) => {
      return true;
    });
    sandbox.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
      return true;
    });
    sandbox.stub(fs, "readFileSync").callsFake((path: any, options: any) => {
      return '{"clientId":"clientId","secret":"secret","tenantId":"3c8f28dd-b990-4925-96a6-3ea9495654b8"}';
    });
    sandbox
      .stub(fs, "readFile")
      .callsFake(async (file: string | Buffer | number, options?: any) => {
        return Buffer.from(
          '{"i":"1f26ae86a392931c124a60bdd87bcfad","c":"855944b46b9250d67494aa072bafe4bafe8dee9712ae4dd21bc31d9fa75ba4048ac4845fd68905fc1dca28fd5df06bed6af2c7ecb57121b0ba560fd1a71ed241eafef0aa503c0a51722aa11b1e8482dfded052bb9e66630fb785b3","t":"b1b705aa70948661e365e9f3e95c6cae"}',
          "utf-8"
        );
      });
  });

  after(() => {
    sandbox.restore();
  });

  it("AzureSpCrypto test", async () => {
    (<any>AzureSpCrypto).accountCrypto.keytar = new MockKeytar();
    await AzureSpCrypto.saveAzureSP("clientId", "secret", "tenantId");
    const checkAzureSp = AzureSpCrypto.checkAzureSPFile();
    expect(checkAzureSp).to.be.true;
    await AzureSpCrypto.loadAzureSP();
    await AzureSpCrypto.clearAzureSP();
    await loadAccountId("abc");
    await clearCache("abc");
  });
});
