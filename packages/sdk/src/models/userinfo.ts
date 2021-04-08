// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * UserInfo with user displayName, objectId and preferredUserName.
 *
 * @beta
 */
export interface UserInfo {
  /**
   * User Display Name.
   *
   * @readonly
   */
  displayName: string;

  /**
   * User unique reference within the Azure Active Directory domain.
   *
   * @readonly
   */
  objectId: string;

  /**
   * Usually be the email address.
   *
   * @readonly
   */
  preferredUserName: string;
}
