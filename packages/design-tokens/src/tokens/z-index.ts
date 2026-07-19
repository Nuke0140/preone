/**
 * Z-index scale tokens for PreOne design system.
 */

export interface ZIndexTokens {
  hide:           number;
  auto:           string;
  base:           number;
  dropdown:       number;
  sticky:         number;
  fixed:          number;
  modalBackdrop:  number;
  modal:          number;
  popover:        number;
  tooltip:        number;
  notification:   number;
  toast:          number;
}

export const zIndexTokens: ZIndexTokens = Object.freeze({
  hide:          -1,
  auto:          "auto",
  base:           0,
  dropdown:     1000,
  sticky:       1100,
  fixed:        1200,
  modalBackdrop:1300,
  modal:        1400,
  popover:      1500,
  tooltip:      1600,
  notification: 1700,
  toast:        1800,
});
