// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CopilotPluginGenerator } from "./copilotPlugin/generator";
import { OfficeAddinGeneratorNew } from "./officeAddin/generator";
import { SPFxGeneratorImport, SPFxGeneratorNew } from "./spfx/spfxGenerator";
import { SsrTabGenerator } from "./templates/ssrTabGenerator";
import { DefaultTemplateGenerator } from "./templates/templateGenerator";
import { CustomCopilotGenerator } from "./customCopilot/generator";
import { SMEGenerator } from "./sme/generator";

// When multiple generators are activated, only the top one will be executed.
export const Generators = [
  new OfficeAddinGeneratorNew(),
  new SsrTabGenerator(),
  new SPFxGeneratorNew(),
  new SPFxGeneratorImport(),
  new CopilotPluginGenerator(),
  new CustomCopilotGenerator(),
  new SMEGenerator(),
  new DefaultTemplateGenerator(),
];
