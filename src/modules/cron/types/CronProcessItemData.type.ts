export type CronProcessItemDataType = {
  [cronKey: string]: {
    device_dynamogramm_prepare_command_schedule_id: number;
    device_id: number;
    cron_timer: string;
    last_command_send_dt: Date;
    method: () => void;
    timezone: string;
  };
};
