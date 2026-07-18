/**
 * @preone/ui — Input Components
 *
 * Barrel export for all input components in the @preone/ui package.
 *
 * @module inputs
 */

// Text-based inputs
export { Input, inputVariants } from './input.js';
export type { InputProps } from './input.js';

export { Textarea, textareaVariants } from './textarea.js';
export type { TextareaProps } from './textarea.js';

export { Password, passwordVariants } from './password.js';
export type { PasswordProps, PasswordStrength } from './password.js';

export { OTPInput, otpBoxVariants } from './otp-input.js';
export type { OTPInputProps } from './otp-input.js';

export { PhoneInput, phoneInputVariants, defaultCountries } from './phone-input.js';
export type { PhoneInputProps, CountryEntry } from './phone-input.js';

export { SearchInput, searchInputVariants } from './search-input.js';
export type { SearchInputProps } from './search-input.js';

export { NumberInput, numberInputVariants } from './number-input.js';
export type { NumberInputProps } from './number-input.js';

export { CurrencyInput, currencyInputVariants, currencies } from './currency-input.js';
export type { CurrencyInputProps, CurrencyConfig } from './currency-input.js';

export { DatePicker, datePickerVariants } from './date-picker.js';
export type { DatePickerProps } from './date-picker.js';

// Selection inputs
export { Select, selectTriggerVariants } from './select.js';
export type { SelectProps, SelectOption } from './select.js';

export { MultiSelect, multiSelectVariants } from './multi-select.js';
export type { MultiSelectProps, MultiSelectOption } from './multi-select.js';

export { Autocomplete, autocompleteVariants } from './autocomplete.js';
export type { AutocompleteProps, AutocompleteOption } from './autocomplete.js';

// Toggle inputs
export { Checkbox, checkboxVariants } from './checkbox.js';
export type { CheckboxProps } from './checkbox.js';

export { RadioGroup, radioIndicatorVariants } from './radio.js';
export type { RadioGroupProps, RadioOption } from './radio.js';

export { Switch, switchTrackVariants, switchThumbVariants } from './switch.js';
export type { SwitchProps } from './switch.js';

export { Slider, sliderTrackVariants, sliderThumbVariants } from './slider.js';
export type { SliderProps } from './slider.js';

export { Rating, ratingVariants } from './rating.js';
export type { RatingProps } from './rating.js';
