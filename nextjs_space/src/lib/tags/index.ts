/* Auto-merged tag handler registry — see src/lib/tags/handlers-*.ts */
import handlers0 from './handlers-cards';
import handlers1 from './handlers-contacts';
import handlers2 from './handlers-queue';
import handlers3 from './handlers-comms';
import handlers4 from './handlers-memory';
import handlers5 from './handlers-relays';
import handlers6 from './handlers-projects';
import handlers7 from './handlers-marketplace';
import handlers8 from './handlers-orchestration';
import type { TagHandlerMap } from './_types';

export const TAG_HANDLERS: TagHandlerMap = {
  ...handlers0,
  ...handlers1,
  ...handlers2,
  ...handlers3,
  ...handlers4,
  ...handlers5,
  ...handlers6,
  ...handlers7,
  ...handlers8,
};

export type { TagHandler, TagHandlerMap } from './_types';
