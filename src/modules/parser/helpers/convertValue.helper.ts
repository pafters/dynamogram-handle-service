import { DynamoValueType } from 'src/types/DynamoValue.type';
import { formatDate } from './formatDate.helper';

export function convertBufferToDynamoValue(
  dynamo: ArrayLike<number> | ArrayBuffer,
  // translate,
): DynamoValueType {
  try {
    const buffer = new Uint8Array(dynamo).buffer;
    const dataView = new DataView(buffer);

    // const startRecord = dataView.getUint16(0, true);
    // const idRecord = dataView.getUint16(2, true);
    const LengthRecord = dataView.getUint16(4, true);
    // const recordTime = dataView.getUint32(6, true);
    const unixTime = dataView.getUint32(10, true);
    const lengthParameters = dataView.getUint32(14, true);
    //parameters
    // const plungerStock = dataView.getFloat32(18, true);
    // const fullCoefficient = dataView.getFloat32(22, true);
    // const tempPump = dataView.getFloat32(26, true);
    // const lengthShtok = dataView.getFloat32(30, true);
    // const debit = dataView.getFloat32(34, true);
    // const dynamLevel = dataView.getFloat32(38, true);
    // const pumpFillage = dataView.getFloat32(42, true);

    const recordDateMs = unixTime * 1000;
    const formattedRecordTime = formatDate(new Date(recordDateMs));

    const data: number[][] = [];
    // if (LengthRecord > 18 + lengthParameters) {
    //   LengthRecord = 18 + lengthParameters;
    // }
    //data
    for (
      let index = 18 + lengthParameters;
      index + 8 < 6 + LengthRecord;
      index = index + 8
    ) {
      const force = dataView.getFloat32(index + 4, true); // нагрузка на шток
      const move = dataView.getFloat32(index, true); // перемещение штока
      if (
        force !== undefined &&
        move !== undefined &&
        force != -100 &&
        force != 0
      ) {
        const resultMove = Math.round(move * 1000);
        data.push([force, resultMove]);
      }
    }

    const points = data.length; // попарно разбитые координаты в точки
    const valueArray = data.flat(); // массив несгруппированных в точки координат
    const date = formattedRecordTime.split(' ')[0];
    const time = formattedRecordTime.split(' ')[1];

    return {
      points,
      valueArray,
      date,
      time,
    };
  } catch (e) {
    console.error(`ERROR (convertValue):`, e);
    throw e;
  }
}
