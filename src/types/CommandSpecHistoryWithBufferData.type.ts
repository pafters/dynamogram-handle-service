export type CommandSpecHistoryWithBufferDataType = {
  id: number;
  server_id: number;
  modem_id: number;
  device_id: number;
  topic: string;
  value: string;
  user_id: number;
  dt: Date;
  guid: string;
  name: string;
  status: string;
  dt_response: Date;
  response: string;
  error: string;
  addon: string;
  progress: number;
  data: Uint8Array;
};
