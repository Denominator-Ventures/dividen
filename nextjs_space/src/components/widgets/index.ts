/**
 * DiviDen Widget Library
 *
 * Theme-agnostic, reusable widget primitives.
 * Override CSS variables in widget-theme.css to theme for any design system.
 *
 * Usage:
 *   import { WidgetSlider, WidgetToggle, AgentWidget } from '@/components/widgets';
 *   import '@/components/widgets/widget-theme.css'; // or provide your own overrides
 */

// Form primitives
export { WidgetSlider } from './WidgetSlider';
export type { WidgetSliderProps } from './WidgetSlider';

export { WidgetToggle } from './WidgetToggle';
export type { WidgetToggleProps } from './WidgetToggle';

export { WidgetRadio } from './WidgetRadio';
export type { WidgetRadioProps, WidgetRadioOption } from './WidgetRadio';

export { WidgetSelect } from './WidgetSelect';
export type { WidgetSelectProps, WidgetSelectOption } from './WidgetSelect';

export { WidgetTextInput } from './WidgetTextInput';
export type { WidgetTextInputProps } from './WidgetTextInput';

export { WidgetInfo } from './WidgetInfo';
export type { WidgetInfoProps } from './WidgetInfo';

export { WidgetGoogleConnect } from './WidgetGoogleConnect';
export type { WidgetGoogleConnectProps } from './WidgetGoogleConnect';

export { WidgetWebhookSetup } from './WidgetWebhookSetup';
export type { WidgetWebhookSetupProps } from './WidgetWebhookSetup';

export { WidgetSubmitButton } from './WidgetSubmitButton';
export type { WidgetSubmitButtonProps } from './WidgetSubmitButton';

export { WidgetSkipButton } from './WidgetSkipButton';
export type { WidgetSkipButtonProps } from './WidgetSkipButton';

// Agent widget system
export {
  AgentWidget,
  AgentWidgetContainer,
  parseWidgetPayload,
} from './AgentWidget';
export type {
  AgentWidgetData,
  WidgetPayload,
  WidgetItem,
  WidgetItemAction,
} from './AgentWidget';
