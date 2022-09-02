// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  fetchTemplatesUrlWithTagAction,
  fetchTemplatesZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  ScaffoldAction,
  unzipAction,
} from "../../common/template-utils/templatesActions";

class Generator {
  static async generateFromTemplates(
    templateName: string,
    lauguage: string,
    destinationPath: string,
    fileNameReplaceMap: Map<string, string>,
    fileContentReplaceMap: Map<string, string>
  ): Promise<void> {}
  static async generateFromSamples(
    sampleName: string,
    destinationPath: string,
    fileNameReplaceMap: Map<string, string>,
    fileContentReplaceMap: Map<string, string>
  ): Promise<void> {}
  static async generate(context: string, actions: string[]) {}
}
interface scaffoldContext {
  group?: string;
  templateName?: string;
  sampleName?: string;
  destinationPath?: string;
}

export const TemplateActionSeq: ScaffoldAction[] = [
  fetchTemplatesUrlWithTagAction,
  fetchTemplatesZipFromUrlAction,
  fetchTemplateZipFromLocalAction,
  unzipAction,
];

export const SampleActionSeq: ScaffoldAction[] = [
  fetchTemplatesUrlWithTagAction,
  fetchTemplatesZipFromUrlAction,
  unzipAction,
];
