// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";

export async function* progressBarHelper(
  titles: (() => string)[],
  progressBar?: IProgressHandler
): AsyncIterableIterator<void> {
  for (const title of titles) {
    yield progressBar?.next(title());
  }
}
