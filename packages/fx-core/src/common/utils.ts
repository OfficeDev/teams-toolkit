// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export async function waitSeconds(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}
