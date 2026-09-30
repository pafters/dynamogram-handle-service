export function checkDateOnUpdate(
  oldDate: number | null,
  newDate: number | null,
): boolean {
  // если у нас нет новой даты - то и обновлять нечего. отказываем
  if (!newDate) {
    return false;
  }
  // если у нас есть новая дата, но нет старой - стоит обновлять
  if (!oldDate && newDate) {
    return true;
  }

  if (
    oldDate && // если у нас есть, и старая дата, и новая
    newDate &&
    oldDate !== newDate && // если они отличаются друг от друга
    newDate > oldDate // причем новая более актуальная
  ) {
    // то обновляем
    return true;
  }

  // в остальных случаях отказываем в обновлении
  return false;
}
