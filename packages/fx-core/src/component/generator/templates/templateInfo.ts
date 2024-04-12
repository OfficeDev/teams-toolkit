// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProgrammingLanguage } from "../../../question";

export interface TemplateInfo {
  templateName: string;
  language: ProgrammingLanguage;
  replaceMap?: { [key: string]: string };
  filterFn?: (fileName: string) => boolean;
}
