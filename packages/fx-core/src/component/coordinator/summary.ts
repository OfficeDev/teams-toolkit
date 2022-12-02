import { combine, FxError, LogProvider, Result } from "@microsoft/teamsfx-api";
import { DriverDefinition, ExecutionResult, ILifecycle } from "../configManager/interface";
import { EOL } from "os";
import { SummaryConstant } from "../configManager/constant";
import _ from "lodash";

const indent = "  ";

function getActionName(driverDef: DriverDefinition): string {
  return driverDef.name ? `${driverDef.uses}(${driverDef.name})` : driverDef.uses;
}

function getDriverDescription(log: LogProvider, lifecycle: ILifecycle): Result<string[], FxError> {
  const n = lifecycle.driverDefs.length;
  return lifecycle.resolveDriverInstances(log).map((instances) => {
    return instances.map((instance, i) => {
      const actionName = getActionName(instance);
      const desc = instance.instance.description ? `: ${instance.instance.description}` : "";
      return `(${i + 1}/${n}) Action ${actionName}${desc}`;
    });
  });
}

export function getLifecycleDescription(
  log: LogProvider,
  lifecycle: ILifecycle
): Result<string, FxError> {
  const n = lifecycle.driverDefs.length;
  return getDriverDescription(log, lifecycle).map((descriptions) => {
    const s = `Running lifecycle stage: ${
      lifecycle.name
    }(${n} step(s) in total) The following actions will be executed${EOL}${descriptions.join(EOL)}`;
    return s;
  });
}

type LifecycleState = {
  name: string;
  status: "succeeded" | "failed" | "notExecuted";
  actionStates: ActionState[];
};

function initLifecycleState(lifecycle: ILifecycle): LifecycleState {
  return {
    name: lifecycle.name,
    status: "notExecuted",
    actionStates: initActionStates(lifecycle),
  };
}

function updateLifecycleState(state: LifecycleState, execResult: ExecutionResult): void {
  if (execResult.result.isOk()) {
    state.status = "succeeded";
  } else {
    state.status = "failed";
  }

  updateActionStates(state.actionStates, execResult);
}

type ActionState = {
  name: string;
  status: "succeeded" | "failed" | "notExecuted";
  summaries: string[];
};

function initActionStates(lifecycle: ILifecycle): ActionState[] {
  return lifecycle.driverDefs.map((driverDef) => {
    return {
      name: getActionName(driverDef),
      status: "notExecuted",
      summaries: [],
    };
  });
}

function updateActionStates(actionStates: ActionState[], executionResult: ExecutionResult): void {
  const { result, summaries } = executionResult;
  if (result.isOk()) {
    actionStates.forEach((actionState, i) => {
      actionState.status = "succeeded";
      if (summaries[i]) {
        actionState.summaries = summaries[i];
      }
    });
  } else if (result.isErr()) {
    const e = result.error;
    if (e.kind === "Failure") {
      // just ignore Failure, because we can leave action states as "notExecuted"
    } else if (e.kind === "PartialSuccess") {
      const executedActionNum = summaries.length;
      actionStates.forEach((actionState, i) => {
        if (i < executedActionNum - 1) {
          actionState.status = "succeeded";
        } else if (i == executedActionNum - 1) {
          actionState.status = "failed";
        }

        if (summaries[i]) {
          actionState.summaries = summaries[i];
        }
      });
    }
  }
}

function stringifyLifecycleState(lifecycleState: LifecycleState): string[] {
  const result: string[] = [];

  if (lifecycleState.status === "notExecuted") {
    result.push(`Lifecycle stage ${lifecycleState.name} not executed.`);
  } else if (lifecycleState.status === "succeeded") {
    result.push(
      `${SummaryConstant.Tick} Lifecycle stage ${lifecycleState.name} executed successfully`
    );
  } else if (lifecycleState.status === "failed") {
    result.push(`${SummaryConstant.Cross} Lifecycle stage ${lifecycleState.name} failed.`);
  }

  for (const actionState of lifecycleState.actionStates) {
    if (actionState.status === "notExecuted") {
      result.push(`${indent}${actionState.name} not executed.`);
    } else if (actionState.status === "failed") {
      result.push(`${indent}${SummaryConstant.Cross} ${actionState.name} failed.`);
    } else if (actionState.status === "succeeded") {
      result.push(`${indent}${SummaryConstant.Tick} ${actionState.name} executed successfully.`);
    }
    for (const [i, summary] of actionState.summaries.entries()) {
      result.push(`${indent}${indent}${summary}`);
    }
  }

  return result;
}

export class SummaryReporter {
  private lifecycles: ILifecycle[];
  private lifecycleStates: LifecycleState[];
  private log: LogProvider;

  constructor(lifecycles: ILifecycle[], log: LogProvider) {
    this.lifecycles = lifecycles;
    this.lifecycleStates = lifecycles.map((lifecycle) => initLifecycleState(lifecycle));
    this.log = log;
  }

  // This method returns a Result, because it could fail due to driver resolution failure.
  getLifecycleDescriptions(): Result<string, FxError> {
    return combine(
      this.lifecycles.map((lifecycle) => getLifecycleDescription(this.log, lifecycle))
    ).map((descriptions) => descriptions.join(EOL));
  }

  updateLifecycleState(index: number, execResult: ExecutionResult): void {
    updateLifecycleState(this.lifecycleStates[index], execResult);
  }

  getLifecycleSummary(): string {
    const summaries = this.lifecycleStates.map((lifecycleState) => {
      return stringifyLifecycleState(lifecycleState);
    });

    const flattened = _.flatten(summaries);
    return `Summary:${EOL}${flattened.join(EOL)}`;
  }
}
