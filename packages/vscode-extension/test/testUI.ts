// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, GroupOfTasks, RunnableTask, err, UserCancelError } from "@microsoft/teamsfx-api";
import { VS_CODE_UI } from "../src/extension"; 
import { sleep } from "../src/utils/commonUtils";
import VsCodeLogInstance from "../src/commonlib/log";
export async function testProgress(){

  const task1:RunnableTask<undefined> = 
  {
    name : "task1",
    run: async (... args:any):Promise<Result<undefined, FxError>>=>{
      await sleep(3000);
      return ok(undefined);
    }
  }  
 
  const task2:RunnableTask<undefined> = 
  {
    name : "task2",
    run: async (... args:any):Promise<Result<undefined, FxError>>=>{
      await sleep(3000);
      return err(UserCancelError);
    }
  }  
  const task3:RunnableTask<undefined> = 
  {
    name : "task3",
    run: async (... args:any):Promise<Result<undefined, FxError>>=>{
      await sleep(3000);
      return ok(undefined);
    }
  }  
  let sequentialRes = await VS_CODE_UI.selectOption({name:"sequential", title:"sequential", options:["Yes", "No"]});
  if(sequentialRes.isErr()) {
    VS_CODE_UI.showMessage("error", sequentialRes.error.name, false);
    return ;
  }
  let fastFailRes = await VS_CODE_UI.selectOption({name:"fastFail", title:"fastFail", options:["Yes", "No"]});
  if(fastFailRes.isErr()) {
    VS_CODE_UI.showMessage("error", fastFailRes.error.name, false);
    return ;
  }
  let showProgressRes = await VS_CODE_UI.selectOption({name:"showProgress", title:"showProgress", options:["Yes", "No"]});
  if(showProgressRes.isErr()) {
    VS_CODE_UI.showMessage("error", showProgressRes.error.name, false);
    return ;
  }
  let cancellableRes = await VS_CODE_UI.selectOption({name:"cancellable", title:"cancellable", options:["Yes", "No"]});
  if(cancellableRes.isErr()) {
    VS_CODE_UI.showMessage("error", cancellableRes.error.name, false);
    return ;
  }
  const sequential = (sequentialRes.value.result === "Yes");
  const fastFail = (fastFailRes.value.result === "Yes");
  const showProgress = (showProgressRes.value.result === "Yes");
  const cancellable = (cancellableRes.value.result === "Yes");
  const group = new GroupOfTasks<undefined>([task1,task2,task3], {sequential:sequential, fastFail:fastFail});
  const res = await VS_CODE_UI.runWithProgress(group, {showProgress:showProgress, cancellable:cancellable});
  VsCodeLogInstance.info(JSON.stringify(res, null, 4));
}