export interface Connector {
  objectId: string | null;
  connectorId: string | null;
  name: string;
  configurationUrl: string;
  scopes: string[];
}
