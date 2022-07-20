import { SystemError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export class ActionNotExist extends SystemError {
  constructor(action: string) {
    super({
      source: "fx",
      message: getDefaultString("error.ActionNotExist", action),
      displayMessage: getLocalizedString("error.ActionNotExist", action),
    });
  }
}

export class ComponentNotExist extends SystemError {
  constructor(component: string) {
    super({
      source: "fx",
      message: getDefaultString("error.ComponentNotExist", component),
      displayMessage: getLocalizedString("error.ComponentNotExist", component),
    });
  }
}
