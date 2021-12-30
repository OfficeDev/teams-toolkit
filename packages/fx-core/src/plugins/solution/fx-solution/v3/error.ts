import { Inputs, UserError } from "@microsoft/teamsfx-api";

export class CapabilityAlreadyAddedError extends UserError {
  constructor(capability: string) {
    super(new.target.name, `Capability ${capability} is already added in the project`, "Solution");
  }
}

export class ResourceAlreadyAddedError extends UserError {
  constructor(pluginName: string) {
    super(new.target.name, `Resource ${pluginName} is already added in the project`, "Solution");
  }
}
