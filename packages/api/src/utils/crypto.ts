// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";

/**
 * Encrypt/decrypt secrets
 */
export interface CryptoProvider {
  /**
   * Encrypt string
   * @param plaintext - original string
   */
  encrypt(plaintext: string): Result<string, FxError>;

  /**
   * Decrypt cipher string
   * @param ciphertext - encrypted string
   */
  decrypt(ciphertext: string): Result<string, FxError>;
}
