// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";

export async function sameContents(filePath1: string, filePath2: string): Promise<boolean> {
  const buffer1: Buffer = await fs.readFile(filePath1);
  const buffer2: Buffer = await fs.readFile(filePath2);
  return buffer1.equals(buffer2);
}
