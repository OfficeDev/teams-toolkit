// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
