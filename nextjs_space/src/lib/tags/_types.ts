import type { TagExecutionResult } from '../action-tags';

export type TagHandler = (
  params: Record<string, any>,
  userId: string,
  name: string
) => Promise<TagExecutionResult>;

export type TagHandlerMap = Record<string, TagHandler>;
