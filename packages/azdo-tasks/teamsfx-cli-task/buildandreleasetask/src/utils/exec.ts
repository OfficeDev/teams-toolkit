// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'

export async function Execute(
  tool: string,
  cmd: string,
  workdir?: string
): Promise<number> {
  const options = workdir ? { cwd: workdir } : undefined
  return await tl.exec(tool, cmd, options)
}