// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class StorageConstants {
  static readonly helpLink = "https://aka.ms/teamsfx-fe-help";
  static readonly azureStorageWebContainer = "$web";
  static readonly dayInMS = 1000 * 60 * 60 * 24;
  static readonly sasTokenLifetimePadding = StorageConstants.dayInMS;
  static readonly sasTokenLifetime = StorageConstants.dayInMS * 3;
  static readonly indexDocument = "index.html";
  static readonly errorDocument = StorageConstants.indexDocument;
}

export const errorSource = "Storage";
