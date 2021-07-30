import { signInAzure } from "../handlers";

import * as StringResources from "../resources/Strings.json";

export class StringContext {
  private static signInAzure: string = StringResources.vsc.handlers.signInAzure;

  public static setSignInAzureContext(value: string): void {
    this.signInAzure = value;
  }

  public static getSignInAzureContext(): string {
    return this.signInAzure;
  }
}
