export type DynamoValueType = {
  points: number; // Количество точек динамограммы
  valueArray: number[]; // Массив несгруппированных в пары координат
  date: string; // Дата создание файла динамографа на КСУ
  time: string; // Время создание файла динамографа на КСУ
};
