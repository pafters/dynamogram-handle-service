import { CommandSpecHistoryWithBufferDataType } from 'src/types/CommandSpecHistoryWithBufferData.type';
import { DynamoValueType } from 'src/types/DynamoValue.type';

export function checkParsedAndSpecDataOnError(
  parsedData: DynamoValueType,
  spec: CommandSpecHistoryWithBufferDataType,
): void {
  if (
    !parsedData.valueArray ||
    parsedData.valueArray.length % 2 !== 0 ||
    parsedData.valueArray.length === 0
  ) {
    throw new Error(
      `command_spec_history_id=${spec.id} error coordinates array is undefined or invalid. valueArray = "${JSON.stringify(parsedData.valueArray)}"`,
    );
  }

  if (parsedData.points === 0) {
    throw new Error(
      `command_spec_history_id=${spec.id} error points have zero length`,
    );
  }

  const dateRegexp = /^\d{4}-\d{2}-\d{2}$/;
  const dateIsCorrect = dateRegexp.test(parsedData.date);

  if (!parsedData.date || dateIsCorrect === false) {
    throw new Error(
      `command_spec_history_id=${spec.id} error date formart with value=${parsedData.date} is invalid. Expected format "YYYY-MM-DD"`,
    );
  }

  const timeRegexp = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]$/;
  const timeIsCorrect = timeRegexp.test(parsedData.time);

  if (!parsedData.date || timeIsCorrect === false) {
    throw new Error(
      `command_spec_history_id=${spec.id} error date formart with value=${parsedData.time} is invalid. Expected format "HH:MM:SS"`,
    );
  }

  if (!spec.device_id) {
    throw new Error(
      `command_spec_history_id=${spec.id} error device not found device_id = ${spec.device_id}`,
    );
  }

  if (
    !spec.dt_response ||
    isNaN(new Date(spec.dt_response).valueOf()) === true
  ) {
    throw new Error(
      `command_spec_history_id=${spec.id} error dt_response is invalid`,
    );
  }
}
