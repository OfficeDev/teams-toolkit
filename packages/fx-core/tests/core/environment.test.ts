// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  CryptoProvider,
  FxError,
  InputConfigsFolderName,
  Result,
  ok,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { environmentManager } from "../../src/core/environment";
import { randomAppName } from "./utils";

class MockCrypto implements CryptoProvider {
  private readonly encryptedValue: string;
  private readonly decryptedValue: string;

  constructor(encryptedValue: string, decryptedValue: string) {
    this.encryptedValue = encryptedValue;
    this.decryptedValue = decryptedValue;
  }

  public encrypt(plaintext: string): Result<string, FxError> {
    return ok(this.encryptedValue);
  }

  public decrypt(ciphertext: string): Result<string, FxError> {
    return ok(this.decryptedValue);
  }
}

describe("APIs of Environment Manager", () => {
  const appName = randomAppName();
  const projectPath = path.resolve(os.tmpdir(), appName);
  describe("Check If File Is Environment Config", () => {
    const configFolder = path.resolve(projectPath, `.${ConfigFolderName}`, InputConfigsFolderName);
    it("correct env config", () => {
      const fileName = "config.test1.json";
      const isEnvConfig = environmentManager.isEnvConfig(
        projectPath,
        path.resolve(configFolder, fileName)
      );
      assert.isTrue(isEnvConfig);
    });

    it("file in incorrect folder", () => {
      const fileName = "config.test1.json";
      const isEnvConfig = environmentManager.isEnvConfig(projectPath, fileName);
      assert.isFalse(isEnvConfig);
    });

    it("file with incorrect name", () => {
      const fileName = "config.json";
      const isEnvConfig = environmentManager.isEnvConfig(
        projectPath,
        path.resolve(configFolder, fileName)
      );
      assert.isFalse(isEnvConfig);
    });
  });
});
