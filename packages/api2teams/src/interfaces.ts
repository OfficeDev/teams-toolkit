import { OpenAPIV3 } from 'openapi-types';

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
  api: OpenAPIV3.OperationObject;
}

export interface ResponseObjectResult {
  name: string;
  url: string;
  operation: string;
  tag: string;
  content: any;
}

export interface CodeResult {
  code: string;
  name: string;
}

export interface CommandIntellisense {
  title: string;
  description: string;
}
