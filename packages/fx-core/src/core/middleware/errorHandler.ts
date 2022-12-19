// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { assembleError, err, Inputs, SystemError, UserError } from "@microsoft/teamsfx-api";
import { setLocale } from "../globalVars";

/**
 * in case there're some uncatched exceptions, this middleware will act as a guard
 * to catch exceptions and return specific error.
 */
export const ErrorHandlerMW: Middleware = async (ctx: HookContext, next: NextFunction) => {
  // const taskName = `${ctx.method} ${
  //   ctx.method === "executeUserTask" ? (ctx.arguments[0] as Func).method : ""
  // }`;
  // if locale is set in inputs, set it globally.
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (inputs.locale) setLocale(inputs.locale);
  try {
    // let log = `FxCore start call:${taskName}`;
    // if (inputs.loglevel && inputs.loglevel === "Debug") {
    //   TOOLS?.logProvider?.debug(log);
    // } else {
    //   TOOLS?.logProvider?.info(log);
    // }
    // const time = new Date().getTime();
    await next();
    // log = `FxCore finish call:${taskName}, time: ${new Date().getTime() - time} ms`;
    // if (inputs.loglevel && inputs.loglevel === "Debug") {
    //   TOOLS?.logProvider?.debug(log);
    // } else {
    //   TOOLS?.logProvider?.info(log);
    // }
  } catch (e) {
    let fxError = assembleError(e);
    if (fxError instanceof SystemError) {
      fxError = await tryConvertToUserError(fxError);
    }
    ctx.result = err(fxError);
  }
};

const Reg1 =
  /The client '.+' with object id '.+' does not have authorization to perform action '.+' over scope '.+' or the scope is invalid. If access was recently granted, please refresh your credentials\./;
const Reg2 = /"resourceGroupName" with value ".+" should satisfy the constraint "Pattern"/;
const Reg3 = /Resource '.+' was disallowed by policy./;
const Reg4 =
  /The subscription '.+' is disabled and therefore marked as read only. You cannot perform any write actions on this subscription until it is re-enabled\./;
const Reg5 =
  /The current subscription type is not permitted to perform operations on any provider namespace. Please use a different subscription\./;
const Reg6 =
  /The provided location '.+' is not available for resource group\. List of available regions is '.+'\./;
const Reg7 = /The subscription '.+' could not be found\./;
const Reg8 =
  /Invalid resource group location '.+'. The Resource group already exists in location '.+'\./;
const Reg9 = /The access token is from the wrong issuer '.+'\./;
const Reg10 = /Entry not found in cache\./;
const Reg11 = /request to .+ failed, reason: .+/;
const Reg12 = /.+no space left on device.+/;
// const Reg12 = /ENOENT: no such file or directory/;
// const Reg13 = /EBUSY: resource busy or locked/;
// const Reg14 = /Lock is not .+ by you/;
// const Reg15 = /EPERM: operation not permitted/;

const Regs = [Reg1, Reg2, Reg3, Reg4, Reg5, Reg6, Reg7, Reg8, Reg9, Reg10, Reg11, Reg12];

async function tryConvertToUserError(err: SystemError): Promise<UserError | SystemError> {
  const msg = err.message;
  if (!msg) return err;
  for (const reg of Regs) {
    if (reg.test(msg) === true) {
      const userError = new UserError(err.source, err.name, err.message);
      userError.stack = err.stack;
      return userError;
    }
  }
  return err;
}
