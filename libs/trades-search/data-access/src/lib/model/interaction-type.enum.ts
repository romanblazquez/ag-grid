export enum InteractionType {
  Click = 'Click',
  Keyboard = 'Keyboard',
  Touch = 'Touch',
}

export function getInteractionTypeFromEvent(event: Event): InteractionType {
  const ev = event as MouseEvent & KeyboardEvent;
  if (ev?.type === 'keydown' || ev?.type === 'keyup' || ev?.key) {
    return InteractionType.Keyboard;
  }
  if ((event as TouchEvent).touches) return InteractionType.Touch;
  return InteractionType.Click;
}
