/**
 * Timer - measures call-rate of a function and the distribution of the duration of all calls
 */
import { performance } from "perf_hooks";
import { timerData, tracePoint } from "../rawData";
import { traceId } from "../tracing";

export const timer = () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  /* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      /**
       * get essential properties
       */
      const data: tracePoint = {
        traceId: traceId(),
        dir: __dirname,
        file: __filename,
        class: this.constructor.name,
        method: originalMethod.name,
        args: args,
        timestamp: Date.now(),
      };

      /**
       * time to start
       */
      const start = performance.now();

      /**
       * invoke origin method
       */
      const result = await originalMethod.apply(this, args);

      /**
       * time to end in
       */
      const end = performance.now();

      const timerData: timerData = {
        duraion: end - start,
      };
      data.timer = timerData;
      console.log(data);
      return result;
    };
  };
};
