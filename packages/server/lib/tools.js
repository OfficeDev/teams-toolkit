"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteTools =
  exports.RemoteTelemetryReporter =
  exports.RemoteUserInteraction =
  exports.RemoteTokenProvider =
  exports.RemoteSharepointTokenProvider =
  exports.RemoteAppStudioTokenProvider =
  exports.RemoteGraphTokenProvider =
  exports.RemoteAzureAccountProvider =
  exports.RemoteLogProvider =
    void 0;
class RemoteLogProvider {
  constructor(connection) {
    this.connection = connection;
  }
  log(logLevel, message) {
    throw new Error("Method not implemented.");
  }
  trace(message) {
    throw new Error("Method not implemented.");
  }
  debug(message) {
    throw new Error("Method not implemented.");
  }
  info(message) {
    return __awaiter(this, void 0, void 0, function* () {
      this.connection.sendNotification("logger.info", message);
      return true;
    });
  }
  warning(message) {
    throw new Error("Method not implemented.");
  }
  error(message) {
    throw new Error("Method not implemented.");
  }
  fatal(message) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteLogProvider = RemoteLogProvider;
class RemoteAzureAccountProvider {
  constructor(connection) {
    this.connection = connection;
  }
  getAccountCredentialAsync(showDialog, tenantId) {
    throw new Error("Method not implemented.");
  }
  getIdentityCredentialAsync(showDialog) {
    throw new Error("Method not implemented.");
  }
  signout() {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name, statusChange, immediateCall) {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name) {
    throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog) {
    throw new Error("Method not implemented.");
  }
  listSubscriptions() {
    throw new Error("Method not implemented.");
  }
  setSubscription(subscriptionId) {
    throw new Error("Method not implemented.");
  }
  getAccountInfo() {
    throw new Error("Method not implemented.");
  }
  getSelectedSubscription(triggerUI) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteAzureAccountProvider = RemoteAzureAccountProvider;
class RemoteGraphTokenProvider {
  constructor(connection) {
    this.connection = connection;
  }
  getAccessToken(showDialog) {
    throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog) {
    throw new Error("Method not implemented.");
  }
  signout() {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name, statusChange, immediateCall) {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteGraphTokenProvider = RemoteGraphTokenProvider;
class RemoteAppStudioTokenProvider {
  constructor(connection) {
    this.connection = connection;
  }
  getAccessToken(showDialog) {
    throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog) {
    throw new Error("Method not implemented.");
  }
  signout() {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name, statusChange, immediateCall) {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteAppStudioTokenProvider = RemoteAppStudioTokenProvider;
class RemoteSharepointTokenProvider {
  constructor(connection) {
    this.connection = connection;
  }
  getAccessToken(showDialog) {
    throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog) {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name, statusChange, immediateCall) {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteSharepointTokenProvider = RemoteSharepointTokenProvider;
class RemoteTokenProvider {
  constructor(connection) {
    this.connection = connection;
    this.azureAccountProvider = new RemoteAzureAccountProvider(connection);
    this.graphTokenProvider = new RemoteGraphTokenProvider(connection);
    this.appStudioToken = new RemoteAppStudioTokenProvider(connection);
    this.sharepointTokenProvider = new RemoteSharepointTokenProvider(connection);
  }
}
exports.RemoteTokenProvider = RemoteTokenProvider;
class RemoteUserInteraction {
  constructor(connection) {
    this.connection = connection;
  }
  openUrl(link) {
    throw new Error("Method not implemented.");
  }
  runWithProgress(task, config, ...args) {
    throw new Error("Method not implemented.");
  }
  selectOption(config) {
    return __awaiter(this, void 0, void 0, function* () {
      throw new Error("Method not implemented.");
    });
  }
  selectOptions(config) {
    throw new Error("Method not implemented.");
  }
  inputText(config) {
    throw new Error("Method not implemented.");
  }
  selectFile(config) {
    throw new Error("Method not implemented.");
  }
  selectFiles(config) {
    throw new Error("Method not implemented.");
  }
  selectFolder(config) {
    throw new Error("Method not implemented.");
  }
  showMessage(level, message, modal, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
      throw new Error("Method not implemented.");
    });
  }
  createProgressBar(title, totalSteps) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteUserInteraction = RemoteUserInteraction;
class RemoteTelemetryReporter {
  constructor(connection) {
    this.connection = connection;
  }
  sendTelemetryEvent(eventName, properties, measurements) {
    throw new Error("Method not implemented.");
  }
  sendTelemetryErrorEvent(eventName, properties, measurements, errorProps) {
    throw new Error("Method not implemented.");
  }
  sendTelemetryException(error, properties, measurements) {
    throw new Error("Method not implemented.");
  }
}
exports.RemoteTelemetryReporter = RemoteTelemetryReporter;
class RemoteTools {
  constructor(connection) {
    this.connection = connection;
    this.logProvider = new RemoteLogProvider(connection);
    this.tokenProvider = new RemoteTokenProvider(connection);
    this.telemetryReporter = new RemoteTelemetryReporter(connection);
    this.ui = new RemoteUserInteraction(connection);
  }
}
exports.RemoteTools = RemoteTools;
//# sourceMappingURL=tools.js.map
