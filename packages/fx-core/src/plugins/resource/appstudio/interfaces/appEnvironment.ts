import { AppEnvironmentProperty } from "./appEnvironmentProperty";

export interface AppEnvironment {
  id: string;
  displayName: string;
  properties: AppEnvironmentProperty[];
}
