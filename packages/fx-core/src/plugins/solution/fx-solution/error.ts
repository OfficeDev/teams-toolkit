import { UserError } from "@microsoft/teamsfx-api";

export class CapabilityAlreadyAddedError extends UserError {
  constructor(capability: string) {
    super(new.target.name, `${capability} is already added in the project`, "Solution");
  }
}
