export interface Connector {
  objectId?: string;
  connectorId?: string;
  name: string;
  configurationUrl: string;
  scopes: string[];
}
