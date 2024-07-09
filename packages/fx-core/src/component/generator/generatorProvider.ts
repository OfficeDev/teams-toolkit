// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SpecGenerator } from "./apiSpec/generator";
import { OfficeAddinGeneratorNew } from "./officeAddin/generator";
import { SPFxGeneratorImport, SPFxGeneratorNew } from "./spfx/spfxGenerator";
import { SsrTabGenerator } from "./templates/ssrTabGenerator";
import { DefaultTemplateGenerator } from "./templates/templateGenerator";

// When multiple generators are activated, only the top one will be executed.
export const Generators = [
  new OfficeAddinGeneratorNew(),
  new SsrTabGenerator(),
  new DefaultTemplateGenerator(),
  new SPFxGeneratorNew(),
  new SPFxGeneratorImport(),
  new SpecGenerator(),
];
