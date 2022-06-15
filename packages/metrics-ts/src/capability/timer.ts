/**
 * Timer - measures call-rate of a function and the distribution of the duration of all calls
 */
import { performance } from "perf_hooks";
export const timer = () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const end = performance.now();
      console.log(end - start);
      return result;
    };
  };
};
