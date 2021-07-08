import {ActionInputs} from './constant'
import {Operations} from './operations'
import {OperationType} from './enums/operationTypes'
import {WordsToList} from './utils/words-to-list'
import {InputsError} from './errors'
import {Capability} from './enums/capabilities'
import {BaseError} from './base-error'
import * as fs from 'fs-extra'
import * as tl from 'azure-pipelines-task-lib/task'

async function run(): Promise<void> {
  try {
    let projectRoot = tl.getInput(ActionInputs.ProjectRoot)
    const operationType = tl.getInput(ActionInputs.OperationType)

    if (
      !projectRoot ||
      !(await fs.pathExists(projectRoot)) ||
      !operationType ||
      !Object.values<string>(OperationType).includes(operationType)
    ) {
      throw new InputsError(
        `${ActionInputs.ProjectRoot}: ${projectRoot}, ${ActionInputs.OperationType}: ${operationType}`
      )
    }

    switch (operationType) {
      case OperationType.BuildTeamsApp: {
        let capabilities = tl.getInput(ActionInputs.Capabilities)
        if (!capabilities) {
          // default to build all.
          capabilities = Object.values<string>(Capability).join(',')
        }

        const capabilityList = WordsToList(capabilities)
        if (
          capabilityList.some(
            (value: string) =>
              !Object.values<string>(Capability).includes(value)
          )
        ) {
          throw new InputsError(`${ActionInputs.Capabilities}: ${capabilities}`)
        }

        await Operations.BuildTeamsApp(projectRoot, capabilityList)
        break
      }
      case OperationType.ProvisionHostingEnvironment:
        await Operations.ProvisionHostingEnvironment(projectRoot)
        break
      case OperationType.DeployToHostingEnvironment:
        await Operations.DeployToHostingEnvironment(projectRoot)
        break
      case OperationType.PackTeamsApp:
        await Operations.PackTeamsApp(projectRoot)
        break
      case OperationType.ValidateManifest:
        await Operations.ValidateTeamsAppManifest(projectRoot)
        break
      case OperationType.PublishTeamsApp:
        await Operations.PublishTeamsApp(projectRoot)
        break
    }
  } catch (error) {
    if (error instanceof BaseError) {
      tl.setResult(tl.TaskResult.Failed, error.genMessage())
    } else {
      tl.setResult(tl.TaskResult.Failed, error.message)
    }
  }
}

run()

export default run
