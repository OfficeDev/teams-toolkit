// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CryptoProvider, err, FxError, ok, Result, SystemError } from "@microsoft/teamsfx-api";
import Cryptr from "cryptr";

export class LocalCrypto implements CryptoProvider {
  private cryptr: Cryptr;
  private prefix = "crypto_";

  constructor(projectId: string) {
    this.cryptr = new Cryptr(projectId + "_teamsfx");
  }

  public encrypt(plaintext: string): Result<string, FxError> {
    return ok(this.prefix + this.cryptr.encrypt(plaintext));
  }

  public decrypt(ciphertext: string): Result<string, FxError> {
    if (!ciphertext.startsWith(this.prefix)) {
      // legacy raw secret string
      return ok(ciphertext);
    }
    try {
      return ok(this.cryptr.decrypt(ciphertext.substr(this.prefix.length)));
    } catch (e) {
      // ciphertext is broken
      return err(new SystemError("Core", "DecryptionError", "Cipher text is broken"));
    }
  }
}
