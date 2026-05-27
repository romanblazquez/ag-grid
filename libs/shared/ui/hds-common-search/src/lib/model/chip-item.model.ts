export interface ChipItem {
  id: string;
  label: string;
  value?: unknown;
}

export type ChipsSerializer = (chips: ChipItem[]) => string;
export type ChipsParser = (text: string) => string[];
export type ChipsValidator = (label: string) => boolean | Promise<boolean>;
