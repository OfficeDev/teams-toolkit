// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountManager } from "../../../src/commonlib/azureLogin";
import { AccountCrypto, CryptoCachePlugin } from "../../../src/commonlib/cacheAccess";
import { expect } from "../utils";

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

    const content = "Hello World";
    const encrypted = await accountCrypto.encrypt(content);
    expect(encrypted.includes(content)).to.be.false;
    const decrtpyed = await accountCrypto.decrypt(encrypted);
    expect(decrtpyed).equals(content);
  });
});
