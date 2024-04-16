// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OfficeAddinGeneratorNew } from "./officeAddin/generator";
import { DefaultTemplateGenerator } from "./templates/templateGenerator";

export const Generators = [new DefaultTemplateGenerator(), new OfficeAddinGeneratorNew()];
