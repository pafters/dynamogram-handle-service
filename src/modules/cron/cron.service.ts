import { Inject, Injectable, Logger, LoggerService } from '@nestjs/common';
import { schedule } from 'node-cron';
import { addContextDecoratorLogger } from 'src/infrastructure/logger/context.decorator.logger';
import { CronProcessItemDataType } from 'src/modules/cron/types/CronProcessItemData.type';
import { CronTasks } from 'src/modules/cron/types/CronTasks.type';

@Injectable()
export class CronService {
  // { [`${device_id}:${cronExpression}`]: ScheduledTask } | { ['SYSTEM_CRON_<name>']: ScheduledTask }
  private tasks: CronTasks = {}; // Ex: { '1283:*/1 * * * *': ScheduledTask} | { 'SYSTEM_CRON_<name>': ScheduledTask }

  constructor(@Inject(Logger) private readonly logger: LoggerService) {
    this.logger = addContextDecoratorLogger(logger, CronService.name);
  }

  // Метод для добавления задачи
  addCronJob(
    name: string,
    cronExpression: string,
    callback: () => void,
    timezone: string | null = null,
  ): void {
    if (this.tasks[name]) {
      this.logger.warn(`The schedule with name "${name}" already exists`);
      return;
    }
    const options: { timezone?: string } = {};
    if (timezone) {
      options.timezone = timezone;
    }
    const task = schedule(cronExpression, callback, options);
    this.tasks[name] = task;
    task.start(); // запуск задачи
    this.logger.log(
      `The schedule with ${name} has been added and started with interval: "${cronExpression}"`,
    );
  }

  // Метод для удаления задачи
  removeCronJob(name: string): void {
    const task = this.tasks[name];
    if (task) {
      task.stop();
      delete this.tasks[name];
      this.logger.warn(
        `The schedule with name "${name}" has been stopped and removed from active tasks`,
      );
    } else {
      this.logger.warn(`The shedule with name "${name}" not found`);
    }
  }

  private getActiveSystemSchedules(): string[] {
    const schedules = Object.keys(this.tasks);
    const systemSchedules = schedules.filter((s) =>
      s.startsWith('SYSTEM_CRON'),
    );
    return systemSchedules;
  }

  // private destroySystemCronSchedules(): void {
  //   const systemSchedules = this.getActiveSystemSchedules();
  //   for (const schedule of systemSchedules) {
  //     this.removeCronJob(schedule);
  //   }
  // }

  // метод, который актуализирует процессы: избавиться от всех активных процессов, которых нет во входящем массиве процессов
  // и установить новые процессы, которых еще нет в активных
  updateCronProcesses(cronSettingsList: CronProcessItemDataType): void {
    // Получаем текущие активные ключи
    const currentKeys = Object.keys(this.tasks);
    this.logger.log(
      `(updateCronProcesses) currentKeys.length = ${currentKeys.length}`,
    );

    const systemSchedules = this.getActiveSystemSchedules();

    const newCronKeys = systemSchedules.concat(Object.keys(cronSettingsList));

    // Те процессы, которые нужно удалить (есть, но нет в newCronKeys)
    const keysToRemove = currentKeys.filter(
      (key: string) => !newCronKeys.includes(key),
    );

    // Те процессы, которые нужно добавить (есть в newCronKeys, но нет в текущих)
    const keysToAdd = newCronKeys.filter(
      (key: string) => !currentKeys.includes(key),
    );

    this.logger.log(JSON.stringify({ newCronKeys, keysToRemove, keysToAdd }));

    // Удаляем ненужные
    for (const key of keysToRemove) {
      this.removeCronJob(key);
    }

    // Добавляем недостающие
    for (const key of keysToAdd) {
      // key = '1283:*/1 * * * *'
      const cronSetting = cronSettingsList[key];
      if (cronSetting && cronSetting.cron_timer) {
        this.addCronJob(
          key,
          cronSetting.cron_timer,
          cronSetting.method,
          cronSetting.timezone,
        );
        continue;
      }
      this.logger.error({
        err: `(updateCronProcesses) cronSettings or cron_timer are invalids for cron schedule with key="${key}"`,
        cronSetting,
        'cronSetting.cron_timer': cronSetting.cron_timer,
      });
    }

    const activeCronTasksAfterUpdateProcesses = Object.keys(this.tasks);

    this.logger.warn(
      `(updateCronProcesses) active cron tasks length after update="${activeCronTasksAfterUpdateProcesses.length}"`,
    );
    this.logger.warn(JSON.stringify({ activeCronTasksAfterUpdateProcesses }));

    this.logger.log('Процессы обновлены.');
  }
}
