// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
export interface IAADPassword {
  hint?: string;
  id?: string;
  endDate?: string;
  startDate?: string;
  value?: string;
}

export interface IAADApplication {
  id?: string;
  displayName: string;
  passwords?: IAADPassword[];
  objectId?: string;
}
