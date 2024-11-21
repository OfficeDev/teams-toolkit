// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Template {
  id: string;
  name: string;
  language: "typescript" | "javascript" | "csharp" | "python" | "none";
  description: string;
}

export const Templates: Template[] = [];
