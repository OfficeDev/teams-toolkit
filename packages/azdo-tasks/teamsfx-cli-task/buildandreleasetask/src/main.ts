// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'
import {BaseError} from './baseError'
import {BuildCommandString} from './utils/commandBuilder'
import {Execute} from './utils/exec'
import {Commands, Pathes} from './constant'
import * as fs from 'fs-extra'

async function run(): Promise<void> {
  process.env.CI_ENABLED = 'true'
  try {
    // To use project level teamsfx-cli, run `npm install` first.
    if (!(await fs.pathExists(Pathes.TeamsfxCliPath()))) {
      await Execute(Commands.NpmInstall)
    }
    // Construct a command string from inputs.
    const commandString = BuildCommandString()
    await Execute(commandString)
  } catch (error) {
    if (error instanceof BaseError) {
      tl.setResult(tl.TaskResult.Failed, error.genMessage())
    } else {
      tl.setResult(tl.TaskResult.Failed, error.message)
    }
  }
}

run()
