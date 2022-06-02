export interface ConfigurableTab {
  objectId: string | null;
  configurationUrl: string;
  canUpdateConfiguration: boolean;
  scopes: string[];
  context: string[];
  sharePointPreviewImage: string;
  supportedSharePointHosts: string[];
}
