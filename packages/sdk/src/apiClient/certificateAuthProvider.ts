// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { Agent } from "https";
import { SecureContextOptions } from "tls";
import { AuthProvider } from "./authProvider";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Provider that handles Certificate authentication
 *
 * @beta
 */

export class CertificateAuthProvider implements AuthProvider {
  private certOption: SecureContextOptions;

  /**
   *
   * @param { SecureContextOptions } certOption - information about the cert used in http requests
   *
   * @beta
   */
  constructor(certOption: SecureContextOptions) {
    if (certOption && Object.keys(certOption).length !== 0) {
      this.certOption = certOption;
    } else {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "certOption"),
        ErrorCode.InvalidParameter
      );
    }
  }

  /**
   * Adds authentication info to http requests.
   *
   * @param { AxiosRequestConfig } config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   *
   * @returns Updated axios request config.
   *
   * @throws {@link ErrorCode|InvalidParameter} - when custom httpsAgent in the request has duplicate properties with certOption provided in constructor.
   *
   * @beta
   */
  public async AddAuthenticationInfo(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (!config.httpsAgent) {
      config.httpsAgent = new Agent(this.certOption);
    } else {
      const existingProperties = new Set(Object.keys(config.httpsAgent.options));
      for (const property of Object.keys(this.certOption)) {
        if (existingProperties.has(property)) {
          throw new ErrorWithCode(
            formatString(ErrorMessage.DuplicateHttpsOptionProperty, property),
            ErrorCode.InvalidParameter
          );
        }
      }
      Object.assign(config.httpsAgent.options, this.certOption);
    }
    return config;
  }
}

/**
 * Helper to create SecureContextOptions from PEM format cert
 *
 * @param { string | Buffer } cert - The cert chain in PEM format
 * @param { string | Buffer } key - The private key for the cert chain
 * @param { string? } passphrase - The passphrase for private key
 * @param { string? | Buffer? } ca - Overrides the trusted CA certificates
 *
 * @returns Instance of SecureContextOptions
 *
 * @throws {@link ErrorCode|InvalidParameter} - when any parameter is empty
 *
 */
export function createPemCertOption(
  cert: string | Buffer,
  key: string | Buffer,
  passphrase?: string,
  ca?: string | Buffer
): SecureContextOptions {
  if (cert.length === 0) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.EmptyParameter, "cert"),
      ErrorCode.InvalidParameter
    );
  }
  if (key.length === 0) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.EmptyParameter, "key"),
      ErrorCode.InvalidParameter
    );
  }

  return {
    cert,
    key,
    passphrase,
    ca,
  };
}

/**
 * Helper to create SecureContextOptions from PFX format cert
 *
 * @param { string | Buffer } pfx - The content of .pfx file
 * @param { string? } passphrase - Optional. The passphrase of .pfx file
 *
 * @returns Instance of SecureContextOptions
 *
 * @throws {@link ErrorCode|InvalidParameter} - when any parameter is empty
 *
 */
export function createPfxCertOption(
  pfx: string | Buffer,
  passphrase?: string
): SecureContextOptions {
  if (pfx.length === 0) {
    throw new ErrorWithCode(
      formatString(ErrorMessage.EmptyParameter, "pfx"),
      ErrorCode.InvalidParameter
    );
  }

  return {
    pfx,
    passphrase,
  };
}
