export interface IBotCommand {
  commandKey: string;

  run(parameters: any): any;
}
