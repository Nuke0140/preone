/**
 * @preone/forms - PreOne Enterprise form components
 *
 * Built on react-hook-form and Zod for type-safe form validation
 * with full ARIA accessibility, design token theming, and dark mode support.
 */

// Core form components
export { Form, FormProvider, type FormProps, type FormVariant, type FormSize } from './form.js';
export { FormField, type FormFieldProps, type FormFieldVariant, type FormFieldSize } from './form-field.js';
export { FormSection, type FormSectionProps, type FormSectionVariant, type FormSectionSize } from './form-section.js';
export { FormGrid, type FormGridProps, type GridColumns } from './form-grid.js';
export { ErrorMessage, type ErrorMessageProps, type ErrorMessageVariant, type ErrorMessageSize } from './error-message.js';
export { Label, type LabelProps, type LabelVariant, type LabelSize } from './label.js';
export { HelperText, type HelperTextProps, type HelperTextVariant, type HelperTextSize } from './helper-text.js';
export { FieldArray, type FieldArrayProps } from './field-array.js';

// Specialized field components
export { FileUpload, type FileUploadProps, type FileUploadVariant, type FileUploadSize, type FileItem } from './file-upload.js';
export { ImageUpload, type ImageUploadProps, type ImageUploadVariant, type ImageUploadSize, type ImageItem } from './image-upload.js';
export { PhoneField, type PhoneFieldProps, type PhoneFieldVariant, type PhoneFieldSize } from './phone-field.js';
export { CurrencyField, type CurrencyFieldProps, type CurrencyFieldVariant, type CurrencyFieldSize, type CurrencyOption } from './currency-field.js';
export { AddressField, type AddressFieldProps, type AddressFieldVariant, type AddressFieldSize, type AddressData, type CountryOption } from './address-field.js';
export { OTPField, type OTPFieldProps, type OTPFieldVariant, type OTPFieldSize } from './otp-field.js';
export { PasswordField, type PasswordFieldProps, type PasswordFieldVariant, type PasswordFieldSize, type PasswordStrength } from './password-field.js';
export { DateField, type DateFieldProps, type DateFieldVariant, type DateFieldSize } from './date-field.js';

// Validation utilities
export {
  schemas,
  formSchema,
  passwordWithConfirmation,
  z,
} from './validation.js';

// Utility
export { cn } from './cn.js';
