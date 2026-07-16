/**
 * The built-in element set as a pre-registered registry. Consumer
 * registrations (`PageConfig.elements` / `PAGE_ELEMENTS_KEY`) merge
 * additively over this table. The `page` root is deliberately absent — it is
 * a schema-shape marker owned by the host, not an element.
 */
import type { ElementType } from '../schema';
import type { PageElementRegistry, PageElementDefinition } from './registry';

import { stackElement } from './stack';
import { cardElement } from './card';
import { sectionElement } from './section';
import { dividerElement } from './divider';
import { spacerElement } from './spacer';
import { headingElement } from './heading';
import { paragraphElement } from './paragraph';
import { noteElement } from './note';
import { textInputElement } from './text-input';
import { numberInputElement } from './number-input';
import { checkboxElement } from './checkbox';
import { switchElement } from './switch';
import { radioGroupElement } from './radio-group';
import { selectElement } from './select';
import { multiSelectElement } from './multi-select';
import { otpInputElement } from './otp-input';
import { dateInputElement } from './date-input';
import { dateTimeInputElement } from './datetime-input';
import { buttonElement } from './button';
import { linkElement } from './link';
import { imageElement } from './image';

// Exhaustiveness-checked: a new built-in type without a definition here is a
// compile error. INSERTION ORDER IS PALETTE ORDER — the palette lists the
// merged registry's keys as-is (built-ins first, consumer keys after).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLE: Record<Exclude<ElementType, 'page'>, PageElementDefinition<any>> = {
  stack: stackElement,
  card: cardElement,
  section: sectionElement,
  heading: headingElement,
  paragraph: paragraphElement,
  note: noteElement,
  divider: dividerElement,
  spacer: spacerElement,
  'text-input': textInputElement,
  'number-input': numberInputElement,
  checkbox: checkboxElement,
  switch: switchElement,
  'radio-group': radioGroupElement,
  select: selectElement,
  'multi-select': multiSelectElement,
  'otp-input': otpInputElement,
  'date-input': dateInputElement,
  'datetime-input': dateTimeInputElement,
  button: buttonElement,
  link: linkElement,
  image: imageElement,
};

export const BUILTIN_ELEMENTS: PageElementRegistry = TABLE;
