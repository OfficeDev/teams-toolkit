// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { URL } from "url";

export function isValidHttpUrl(input: string): boolean {
  let url;
  try {
    url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}
