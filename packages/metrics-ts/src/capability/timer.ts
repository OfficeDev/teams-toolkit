/**
 * Timer - measures call-rate of a function and the distribution of the duration of all calls
 */
import { performance } from "perf_hooks";
export const timer = () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      /**
       * time to start
       */
      const start = performance.now();

      /**
       * get essential properties
       */
      const className = this.constructor.name;
      const methodName = originalMethod.name;

      /**
       * invoke origin method
       */
      const result = await originalMethod.apply(this, args);

      /**
       * time to end in
       */
      const end = performance.now();

      const duraion = (end - start).toLocaleString();
      console.log(`class is ${className}, method is ${methodName}, duration is ${duraion}`);
      return result;
    };
  };
};
