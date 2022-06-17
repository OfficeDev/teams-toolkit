// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type TemplateVariable = { [key: string]: string };

export interface CodeTemplateInfo {
  group: string;
  language: string;
  scenario: string;
  variables: TemplateVariable;
}
