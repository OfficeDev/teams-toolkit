/**
 * @author Long Hao <haolong@microsoft.com>
 */

interface A {
  x: string;
  y: number;
  z: string;
}

interface B extends Omit<A, "x" | "y"> {
  x?: string;
  y?: number;
}
