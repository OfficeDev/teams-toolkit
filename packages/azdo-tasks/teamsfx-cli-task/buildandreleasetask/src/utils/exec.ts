// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'
import { Strings } from '../constant'

export async function execute(
  cmd: string,
  workdir?: string
): Promise<number> {
  const options = workdir ? { cwd: workdir } : undefined
  const parts = cmd.split(Strings.Space)
  return await tl.exec(parts[0], parts.slice(1).join(Strings.Space), options)
}