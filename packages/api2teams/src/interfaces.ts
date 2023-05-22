export interface CliOptions {
  output: string;
  force?: boolean;
}

export interface AdaptiveCardResult {
  id: string;
  name: string;
  url: string;
  operation: string;
  isArray: boolean;
  content: any;
  tag: string;
}

export interface ResponseObjectResult {
  name: string;
  url: string;
  operation: string;
  tag: string;
  content: any;
}

export interface ActionHandlerResult {
  code: string;
  name: string;
}
