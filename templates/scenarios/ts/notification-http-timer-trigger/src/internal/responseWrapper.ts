import { WebResponse } from "botbuilder";

// A wrapper to convert Azure Functions Response to Bot Builder's WebResponse.
export class ResponseWrapper implements WebResponse {
  socket?: any;
  originalResponse?: any;
  body?: any;

  constructor(functionResponse?: { [key: string]: any }) {
    this.socket = undefined;
    this.originalResponse = functionResponse;
  }

  end(...args: any[]) {
    // do nothing since res.end() is deprecated in Azure Functions.
  }

  send(body: any) {
    // record the body to be returned later.
    this.body = body;
  }

  status(status: number) {
    // call Azure Functions' res.status().
    return this.originalResponse?.status(status);
  }
}
