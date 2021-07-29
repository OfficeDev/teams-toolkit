// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'
import {ActionInputs, Commands} from '../constant'
import {MultipleOptions} from '../enums/multipleOptions'
import {SingleOptions} from '../enums/singleOptions'

export function BuildCommandString(): string {
  const commands = core.getMultilineInput(ActionInputs.Commands) || []

  // Iterate to collect options.
  const optionsPart: string[] = []

  for (const optionName of Object.values<string>(SingleOptions)) {
    const optionValue = core.getInput(optionName)
    if (optionValue) {
      optionsPart.push(
        [Commands.AddOptionPrefix(optionName), optionValue].join(
          Commands.CommandSpace
        )
      )
    }
  }

  for (const optionName of Object.values<string>(MultipleOptions)) {
    const optionValues = core.getMultilineInput(optionName)
    if (optionValues.length > 0) {
      optionsPart.push(
        `${Commands.AddOptionPrefix(optionName)} ${optionValues.join(
          Commands.CommandSpace
        )}`
      )
    }
  }

  return [Commands.TeamsfxCliName]
    .concat(commands)
    .concat(optionsPart)
    .join(' ')
}
