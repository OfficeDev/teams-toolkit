import { signInAzure } from "../handlers";
import { localize } from "./localizeUtils";

export class StringContext {
  private static signInAzure: string = localize("teamstoolkit.handlers.signInAzure");

  public static setSignInAzureContext(value: string): void {
    this.signInAzure = value;
  }

  public static getSignInAzureContext(): string {
    return this.signInAzure;
  }
}
