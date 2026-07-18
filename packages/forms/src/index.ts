/**
 * @preone/forms - PreOne Enterprise Form System
 * React Hook Form + Zod integration with premium design components
 */

// === Core Form Components ===
export { Form, useFormContext, type FormProps } from './components/Form';
export { FormField, type FormFieldProps } from './components/FormField';
export { FormSection, type FormSectionProps } from './components/FormSection';
export { FormGrid, FormGridItem, type FormGridProps, type FormGridItemProps } from './components/FormGrid';

// === Field Primitives ===
export { ErrorMessage, type ErrorMessageProps } from './components/ErrorMessage';
export { Label, type LabelProps } from './components/Label';
export { HelperText, type HelperTextProps } from './components/HelperText';

// === Dynamic Fields ===
export { FieldArray, type FieldArrayProps } from './components/FieldArray';

// === Specialized Field Components ===
export { FileUpload, type FileUploadProps } from './components/FileUpload';
export { ImageUpload, type ImageUploadProps } from './components/ImageUpload';
export { PhoneField, type PhoneFieldProps } from './components/PhoneField';
export { CurrencyField, type CurrencyFieldProps } from './components/CurrencyField';
export { AddressField, type AddressFieldProps } from './components/AddressField';
export { OTPField, type OTPFieldProps } from './components/OTPField';
export { PasswordField, type PasswordRequirement, type PasswordFieldProps } from './components/PasswordField';
export { DateField, type DateFieldProps } from './components/DateField';

// === Validation Utilities ===
export {
  z,
  createZodResolver,
  emailSchema,
  passwordSchema,
  simplePasswordSchema,
  phoneSchema,
  urlSchema,
  creditCardSchema,
  composeSchemas,
  optionalField,
  nullableField,
  confirmedField,
  passwordConfirmationSchema,
  dateRangeSchema,
  arrayFieldSchema,
} from './validation';

// === Re-export react-hook-form types for convenience ===
export type {
  UseFormReturn,
  UseFormRegister,
  UseFormHandleSubmit,
  UseFormSetValue,
  UseFormGetValues,
  UseFormWatch,
  UseFormReset,
  UseFormTrigger,
  UseFormClearErrors,
  UseFormSetError,
  UseFormUnregister,
  FieldValues,
  FieldPath,
  FieldPathValue,
  FieldErrors,
  Control,
  RegisterOptions,
  ControllerProps,
  SubmitHandler,
  SubmitErrorHandler,
  DefaultValues,
  Mode,
} from 'react-hook-form';
