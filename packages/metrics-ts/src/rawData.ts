export interface tracePoint {
  traceId: string;
  //pspanId: number;
  //spanId: number;
  file: string;
  class: string;
  timestamp: number;
  method: string;
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  args?: any;
  timer?: timerData;
}

export interface timerData {
  duraion: number;
}
