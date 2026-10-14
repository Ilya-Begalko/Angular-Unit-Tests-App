export interface QuoteModel {
  readonly id: number;
  readonly text: string;
  readonly author?: string;
  readonly createdAt: Date;
}
