import {
  CancellationReason,
  BATCH_ADJUSTMENT_REASONS,
  SINGLE_ADJUSTMENT_REASONS,
  CANCELLATION_REASONS,
} from '../constants/cancellation-reasons';

export function getCancellationReasons(
  isBatchOperation: boolean,
): CancellationReason[] {
  return isBatchOperation
    ? BATCH_ADJUSTMENT_REASONS
    : SINGLE_ADJUSTMENT_REASONS;
}

export function getCancelReasonDisplayText(code: string): string {
  if (!code || code.trim() === '') {
    return '';
  }

  const allReasons: CancellationReason[] = [
    ...CANCELLATION_REASONS,
    ...BATCH_ADJUSTMENT_REASONS,
    ...SINGLE_ADJUSTMENT_REASONS,
  ];

  if (code.includes(',')) {
    const codes = code
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    const descriptions = codes.map((c) => {
      const found = allReasons.find((r) => r.code === c);
      return found ? found.description : c;
    });

    return descriptions.join(', ');
  } else {
    const found = allReasons.find((r) => r.code === code.trim());
    return found ? found.description : code;
  }
}
