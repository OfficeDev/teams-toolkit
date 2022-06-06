// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Language } from "./language";

export interface LocalizationInfo {
  defaultLanguageTag: string;
  languages: Language[];
}
