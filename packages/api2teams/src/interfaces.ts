export interface CliOptions {
  output: string;
  force?: boolean;
}

export interface AdaptiveCardResult {
  name: string;
  url: string;
  operation: string;
  isArray: boolean;
  content: any;
}
