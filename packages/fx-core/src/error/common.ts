// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  SystemError,
  SystemErrorOptions,
  UserError,
  UserErrorOptions,
} from "@microsoft/teamsfx-api";
import { camelCase } from "lodash";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { globalVars } from "../core/globalVars";
import { ErrorCategory } from "./types";

export class FileNotFoundError extends UserError {
  constructor(source: string, filePath: string, helpLink?: string) {
    const key = "error.common.FileNotFoundError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "FileNotFoundError",
      message: getDefaultString(key, filePath),
      displayMessage: getLocalizedString(key, filePath),
      helpLink: helpLink,
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export class MissingEnvironmentVariablesError extends UserError {
  constructor(source: string, variableNames: string, filePath?: string, helpLink?: string) {
    const templateFilePath = filePath || globalVars.ymlFilePath || "";
    const envFilePath = globalVars.envFilePath || "";
    const key = "error.common.MissingEnvironmentVariablesError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "MissingEnvironmentVariablesError",
      message: getDefaultString(key, variableNames, templateFilePath, envFilePath),
      displayMessage: getLocalizedString(key, variableNames, templateFilePath, envFilePath),
      helpLink: helpLink || "https://aka.ms/teamsfx-v5.0-guide#environments",
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export class InvalidActionInputError extends UserError {
  constructor(actionName: string, parameters: string[], helpLink?: string) {
    const key = "error.yaml.InvalidActionInputError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(actionName),
      name: "InvalidActionInputError",
      message: getDefaultString(key, actionName, parameters.join(","), globalVars.ymlFilePath),
      displayMessage: getLocalizedString(
        key,
        actionName,
        parameters.join(","),
        globalVars.ymlFilePath
      ),
      helpLink: helpLink || "https://aka.ms/teamsfx-actions",
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export class InvalidProjectError extends UserError {
  constructor() {
    super({
      message: getDefaultString("error.common.InvalidProjectError"),
      displayMessage: getLocalizedString("error.common.InvalidProjectError"),
      source: "coordinator",
      categories: [ErrorCategory.Internal],
    });
  }
}

export class MultipleAuthError extends UserError {
  constructor(authNames: Set<string>) {
    super({
      message: getDefaultString(
        "core.createProjectQuestion.apiSpec.operation.multipleAuth",
        Array.from(authNames).join(", ")
      ),
      displayMessage: getLocalizedString(
        "core.createProjectQuestion.apiSpec.operation.multipleAuth",
        Array.from(authNames).join(", ")
      ),
      source: "coordinator",
      categories: [ErrorCategory.Internal],
    });
  }
}

export class MultipleServerError extends UserError {
  constructor(serverUrls: Set<string>) {
    super({
      message: getDefaultString(
        "core.createProjectQuestion.apiSpec.operation.multipleServer",
        Array.from(serverUrls).join(", ")
      ),
      displayMessage: getLocalizedString(
        "core.createProjectQuestion.apiSpec.operation.multipleServer",
        Array.from(serverUrls).join(", ")
      ),
      source: "coordinator",
      categories: [ErrorCategory.Internal],
    });
  }
}

export class InjectAPIKeyActionFailedError extends UserError {
  constructor() {
    super({
      message: getDefaultString("core.copilot.addAPI.InjectAPIKeyActionFailed"),
      displayMessage: getLocalizedString("core.copilot.addAPI.InjectAPIKeyActionFailed"),
      source: "coordinator",
      categories: [ErrorCategory.Internal],
    });
  }
}

export class JSONSyntaxError extends UserError {
  constructor(filePathOrContent: string, error: any, source?: string) {
    super({
      message: getDefaultString("error.common.JSONSyntaxError", filePathOrContent, error.message),
      displayMessage: getLocalizedString(
        "error.common.JSONSyntaxError",
        filePathOrContent,
        error.message
      ),
      source: source || "coordinator",
      error: error,
      categories: [ErrorCategory.Internal],
    });
  }
}

export class ReadFileError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: source || "unknown",
      message: e.message || getDefaultString("error.common.ReadFileError", e.message),
      displayMessage: e.message || getLocalizedString("error.common.ReadFileError", e.message),
      categories: [ErrorCategory.Internal],
      error: e,
    });
  }
}

export class WriteFileError extends SystemError {
  constructor(e: Error, source?: string) {
    super({
      source: source || "unknown",
      message: e.message || getDefaultString("error.common.WriteFileError", e.message),
      displayMessage: e.message || getLocalizedString("error.common.WriteFileError", e.message),
      categories: [ErrorCategory.Internal],
      error: e,
    });
  }
}

export class FilePermissionError extends UserError {
  constructor(e: Error, source?: string) {
    const msg = getDefaultString("error.common.FilePermissionError", e.message);
    super({
      source: source || "unknown",
      message: msg,
      displayMessage: msg,
      error: e,
      categories: [ErrorCategory.Internal],
    });
  }
}

export class UnhandledError extends SystemError {
  constructor(e: Error, source?: string) {
    const errJson = JSON.stringify(e, Object.getOwnPropertyNames(e));
    const option: SystemErrorOptions = {
      source: camelCase(source) || "unknown",
      error: e,
      message: getDefaultString("error.common.UnhandledError", source, errJson),
      displayMessage: getLocalizedString(
        "error.common.UnhandledError",
        source,
        e.message || errJson
      ),
      categories: [ErrorCategory.Unhandled],
    };
    super(option);
  }
}

export class UnhandledUserError extends UserError {
  constructor(e: Error, source?: string, helpLink?: string) {
    source = source || "unknown";
    super({
      source: camelCase(source),
      message: getDefaultString(
        "error.common.UnhandledError",
        source,
        JSON.stringify(e, Object.getOwnPropertyNames(e))
      ),
      displayMessage: getLocalizedString(
        "error.common.UnhandledError",
        source,
        e.message || JSON.stringify(e, Object.getOwnPropertyNames(e))
      ),
      helpLink: helpLink,
      error: e,
      categories: [ErrorCategory.Unhandled],
    });
  }
}

export class InstallSoftwareError extends UserError {
  constructor(source: string, nameAndVersion: string, helpLink?: string) {
    super({
      source: camelCase(source || "common"),
      message: getDefaultString("error.common.InstallSoftwareError", nameAndVersion),
      displayMessage: getLocalizedString("error.common.InstallSoftwareError", nameAndVersion),
      categories: [ErrorCategory.External],
    });
    if (helpLink) this.helpLink = helpLink;
  }
}

export class MissingRequiredInputError extends UserError {
  constructor(name: string, source?: string) {
    super({
      source: source || "coordinator",
      message: getDefaultString("error.common.MissingRequiredInputError", name),
      displayMessage: getLocalizedString("error.common.MissingRequiredInputError", name),
      categories: [ErrorCategory.Internal],
    });
  }
}

export class InputValidationError extends UserError {
  constructor(name: string, reason: string, source?: string) {
    super({
      source: source || "coordinator",
      message: getDefaultString("error.common.InputValidationError", name, reason),
      displayMessage: getLocalizedString("error.common.InputValidationError", name, reason),
      categories: [ErrorCategory.Internal],
    });
  }
}

export class NoEnvFilesError extends UserError {
  constructor(source: string) {
    const key = "error.common.NoEnvFilesError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "NoEnvFilesError",
      message: getDefaultString(key),
      displayMessage: getLocalizedString(key),
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export class MissingRequiredFileError extends UserError {
  constructor(source: string, task: string, file: string) {
    const key = "error.common.MissingRequiredFileError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "MissingRequiredFileError",
      message: getDefaultString(key, task, file),
      displayMessage: getLocalizedString(key, task, file),
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export class NetworkError extends UserError {
  constructor(source: string, reason: string) {
    const key = "error.common.NetworkError";
    const errorOptions: UserErrorOptions = {
      source: camelCase(source),
      name: "NetworkError",
      message: getDefaultString(key, reason),
      displayMessage: getLocalizedString(key, reason),
      categories: [ErrorCategory.Internal],
    };
    super(errorOptions);
  }
}

export function matchDnsError(message?: string): string | undefined {
  if (!message) return undefined;
  const domainPattern = /(?:getaddrinfo\s(?:EAI_AGAIN)\s)([^\s,]+)/;
  // Use the regular expression to extract the domain from the error message
  const match = message.match(domainPattern);
  let res;
  // Check if a match is found
  if (match && match.length > 1) {
    const domain = match[1];
    res = getLocalizedString("error.common.NetworkError.EAI_AGAIN", domain);
  }
  return res;
}

export class HttpClientError extends UserError {
  constructor(error: any, actionName: string, responseBody: string, helpLink?: string) {
    const messageKey = "error.common.HttpClientError";
    super({
      source: camelCase(actionName),
      name: "HttpClientError",
      message: getDefaultString(messageKey, actionName, responseBody),
      displayMessage: getLocalizedString(messageKey, actionName, responseBody),
      helpLink: helpLink,
      error: error,
      categories: [ErrorCategory.External],
    });
  }
}

export class HttpServerError extends SystemError {
  constructor(error: any, actionName: string, responseBody: string) {
    const messageKey = "error.common.HttpServerError";
    super({
      source: camelCase(actionName),
      name: "HttpServerError",
      message: getDefaultString(messageKey, actionName, responseBody),
      displayMessage: getLocalizedString(messageKey, actionName, responseBody),
      error: error,
      categories: [ErrorCategory.External],
    });
  }
}

export class AccessGithubError extends UserError {
  constructor(url: string, source: string, error: any) {
    const messageKey = "error.common.AccessGithubError";
    super({
      source: source,
      name: "AccessGithubError",
      message: getDefaultString(
        messageKey,
        url,
        error.message || JSON.stringify(error, Object.getOwnPropertyNames(error))
      ),
      displayMessage: getLocalizedString(messageKey, url, error.message),
      error: error,
      categories: [ErrorCategory.External],
    });
  }
}

export class UserCancelError extends UserError {
  constructor(actionName?: string) {
    super({
      source: actionName ? camelCase(actionName) : "ui",
      name: "UserCancel",
      message: "User canceled",
      categories: [ErrorCategory.Internal],
    });
  }
}

export class EmptyOptionError extends SystemError {
  constructor(name: string, source?: string) {
    super({
      source: source ? camelCase(source) : "UI",
      message: `Select option is empty list for question name: ${name}`,
      categories: [ErrorCategory.Internal],
    });
  }
}

export class NotImplementedError extends SystemError {
  constructor(source: string, method: string) {
    super({
      source: source,
      message: `Method not implemented:${method}`,
      categories: [ErrorCategory.Internal],
    });
  }
}
export class ConcurrentError extends UserError {
  constructor(source: string) {
    super({
      source: source,
      message: getLocalizedString("error.common.ConcurrentError"),
      categories: [ErrorCategory.Internal],
    });
  }
}

export class InternalError extends UserError {
  constructor(error: any, source: string) {
    super({
      source: source,
      error: error,
      categories: ["internal", error.code],
    });
  }
}

export function assembleError(e: any, source?: string): FxError {
  if (e instanceof UserError || e instanceof SystemError) return e;
  if (!source) source = "unknown";
  source = camelCase(source);
  const msg = matchDnsError(e.message);
  if (msg) {
    return new NetworkError(source, msg);
  }
  const type = typeof e;
  if (type === "string") {
    return new UnhandledError(new Error(e as string), source);
  } else {
    const code = e.code as string;
    if (code && typeof code === "string" && (errnoCodes[code] || code.startsWith("ERR_"))) {
      // convert to internal error
      return new InternalError(e, source);
    }
    return new UnhandledError(e, source);
  }
}

const errnoCodes: Record<string, string> = {
  E2BIG: "Argument list too long",
  EACCES: "Permission denied",
  EADDRINUSE: "Address already in use",
  EADDRNOTAVAIL: "Address not available",
  EAFNOSUPPORT: "Address family not supported",
  EAGAIN: "Resource temporarily unavailable",
  EALREADY: "Operation already in progress",
  EBADF: "Bad file descriptor",
  EBADMSG: "Bad message",
  EBUSY: "Device or resource busy",
  ECANCELED: "Operation canceled",
  ECHILD: "No child processes",
  ECONNABORTED: "Connection aborted",
  ECONNREFUSED: "Connection refused",
  ECONNRESET: "Connection reset by peer",
  EDEADLK: "Resource deadlock would occur",
  EDESTADDRREQ: "Destination address required",
  EDOM: "Mathematics argument out of domain of function",
  EDQUOT: "Disk quota exceeded",
  EEXIST: "File exists",
  EFAULT: "Bad address",
  EFBIG: "File too large",
  EHOSTUNREACH: "Host is unreachable",
  EIDRM: "Identifier removed",
  EILSEQ: "Illegal byte sequence",
  EINPROGRESS: "Operation in progress",
  EINTR: "Interrupted system call",
  EINVAL: "Invalid argument",
  EIO: "I/O error",
  EISCONN: "Socket is already connected",
  EISDIR: "Is a directory",
  ELOOP: "Too many symbolic links encountered",
  EMFILE: "Too many open files",
  EMLINK: "Too many links",
  EMSGSIZE: "Message too long",
  EMULTIHOP: "Multihop attempted",
  ENAMETOOLONG: "File name too long",
  ENETDOWN: "Network is down",
  ENETRESET: "Network dropped connection because of reset",
  ENETUNREACH: "Network is unreachable",
  ENFILE: "Too many open files in system",
  ENOBUFS: "No buffer space available",
  ENODATA: "No message is available on the STREAM head read queue",
  ENODEV: "No such device",
  ENOENT: "No such file or directory",
  ENOEXEC: "Exec format error",
  ENOLCK: "No locks available",
  ENOLINK: "Link has been severed",
  ENOMEM: "Out of memory",
  ENOMSG: "No message of the desired type",
  ENOPROTOOPT: "Protocol not available",
  ENOSPC: "No space left on device",
  ENOSR: "No STREAM resources",
  ENOSTR: "Not a STREAM",
  ENOSYS: "Function not implemented",
  ENOTCONN: "Socket is not connected",
  ENOTDIR: "Not a directory",
  ENOTEMPTY: "Directory not empty",
  ENOTSOCK: "Socket operation on non-socket",
  ENOTSUP: "Operation not supported",
  ENOTTY: "Inappropriate ioctl for device",
  ENXIO: "No such device or address",
  EOPNOTSUPP: "Operation not supported on socket",
  EOVERFLOW: "Value too large to be stored in data type",
  EPERM: "Operation not permitted",
  EPIPE: "Broken pipe",
  EPROTO: "Protocol error",
  EPROTONOSUPPORT: "Protocol not supported",
  EPROTOTYPE: "Protocol wrong type for socket",
  ERANGE: "Result too large",
  EROFS: "Read-only file system",
  ESPIPE: "Invalid seek",
  ESRCH: "No such process",
  ESTALE: "Stale file handle",
  ETIME: "Timer expired",
  ETIMEDOUT: "Connection timed out",
  ETXTBSY: "Text file busy",
  EWOULDBLOCK: "Operation would block",
  EXDEV: "Cross-device link",
};
