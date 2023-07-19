// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getLocalizedString } from "./localizeUtils";

export function convertToAlphanumericOnly(appName: string): string {
  return appName.replace(/[^\da-zA-Z]/g, "");
}

export function loadingOptionsPlaceholder(): string {
  return getLocalizedString("ui.select.LoadingOptionsPlaceholder");
}

export function loadingDefaultPlaceholder(): string {
  return getLocalizedString("ui.select.LoadingDefaultPlaceholder");
}
