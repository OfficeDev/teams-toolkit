// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type ProjectMetadata = {
  id: string;
  type: "template" | "sample";
  platform: "Teams" | "WXP";
  name: string;
  description: string;
  data?: unknown;
};
