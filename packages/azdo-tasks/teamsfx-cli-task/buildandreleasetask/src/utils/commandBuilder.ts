// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'
import {ActionInputs, Commands, Strings} from '../constant'
import {MultipleOptions} from '../enums/multipleOptions'
import {SingleOptions} from '../enums/singleOptions'

export function BuildCommandString(): string {
  const commands = tl.getDelimitedInput(ActionInputs.Commands, Strings.NewLine) || []

  // Iterate to collect options.
  const optionsPart: string[] = []

  for (const optionName of Object.values<string>(SingleOptions)) {
    const optionValue = tl.getInput(optionName)
    if (optionValue) {
      optionsPart.push(
        [Commands.AddOptionPrefix(optionName), optionValue].join(
          Commands.CommandSpace
        )
      )
    }
  }

  for (const optionName of Object.values<string>(MultipleOptions)) {
    const optionValues = tl.getDelimitedInput(optionName, Strings.NewLine) || []
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
