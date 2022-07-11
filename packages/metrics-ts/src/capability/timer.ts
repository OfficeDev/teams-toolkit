/**
 * Timer - measures call-rate of a function and the distribution of the duration of all calls
 */
import { performance } from "perf_hooks";
import { timerData, tracePoint } from "../rawData";
import { traceId } from "../tracing";
import { appendOutput, appendOutputSync } from "../writer";

export const timer = (fn: string) => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  /* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
  console.log(`fn is ${fn}`);
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    console.log(`__file is ${__filename}`);
    /**
     * get essential properties
     */
    const data: tracePoint = {
      traceId: traceId(),
      file: fn,
      class: target.constructor.name,
      method: originalMethod.name,
      timestamp: Date.now(),
    };

    if (originalMethod.constructor.name === "AsyncFunction") {
      descriptor.value = async function (...args: any[]) {
        data.args = args;

        console.log(`async desc __file is ${__filename}`);
        const start = performance.now();
        const result = await originalMethod.apply(this, args);
        const end = performance.now();
        const timerData: timerData = {
          duraion: end - start,
        };
        data.timer = timerData;

        await appendOutput(data);
        return result;
      };
    } else {
      descriptor.value = function (...args: any[]) {
        data.args = args;

        console.log(`sync desc __file is ${__filename}`);
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        const timerData: timerData = {
          duraion: end - start,
        };
        data.timer = timerData;

        appendOutputSync(data);
        return result;
      };
    }
    return descriptor;
  };
};
