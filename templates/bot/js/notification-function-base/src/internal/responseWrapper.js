// A wrapper to convert Azure Functions Response to Bot Builder's Response.
class ResponseWrapper {
  socket;
  originalResponse;
  headers;
  body;

  constructor(functionResponse) {
    this.socket = undefined;
    this.originalResponse = functionResponse;
  }

  end(...args) {
    // do nothing since res.end() is deprecated in Azure Functions.
  }

  header(name, value) {
    this.headers[name] = value;
  }

  send(body) {
    // record the body to be returned later.
    this.body = body;
    this.originalResponse.body = body;
  }

  status(status) {
    // call Azure Functions' res.status().
    return this.originalResponse?.status(status);
  }
}

module.exports = {
  ResponseWrapper,
};
