// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ApiSecretRegistrationClientSecret {
  id?: string;
  /**
   * Max 128 characters, min 10
   */
  value: string;
  description?: string;
  isValueRedacted?: boolean;
  /**
   * The prioirty of client secret, 0 for highest
   */
  priority?: number;
  createdDateTime?: Date;
}
