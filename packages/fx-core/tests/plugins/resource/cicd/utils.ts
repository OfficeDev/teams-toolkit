// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";

export function sameContents(filePath1: string, filePath2: string): boolean {
  const buffer1: Buffer = fs.readFileSync(filePath1);
  const buffer2: Buffer = fs.readFileSync(filePath2);
  return buffer1.equals(buffer2);
}
