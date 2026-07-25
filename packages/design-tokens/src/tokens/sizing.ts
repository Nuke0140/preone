/**
 * Component sizing tokens for PreOne design system.
 * Preset sizes for icons, avatars, buttons, inputs, sidebar, header.
 * Values in rem (border/shadow exceptions use px).
 */

export interface SizeMap {
  readonly [key: string]: string;
}

export interface IconSizeTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface AvatarSizeTokens {
  xs:   string;
  sm:   string;
  md:   string;
  lg:   string;
  xl:   string;
  "2xl": string;
}

export interface ButtonHeightTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface InputHeightTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface SidebarWidthTokens {
  collapsed: string;
  expanded:  string;
}

export interface HeaderHeightTokens {
  default: string;
}

export interface SizingTokens {
  iconSizes:    IconSizeTokens;
  avatarSizes:  AvatarSizeTokens;
  buttonHeights: ButtonHeightTokens;
  inputHeights: InputHeightTokens;
  sidebarWidth: SidebarWidthTokens;
  headerHeight: HeaderHeightTokens;
}

export const sizingTokens: SizingTokens = Object.freeze({
  iconSizes: Object.freeze({
    xs: "0.75rem",   // 12px
    sm: "1rem",      // 16px
    md: "1.25rem",   // 20px
    lg: "1.5rem",    // 24px
    xl: "2rem",      // 32px
  }),

  avatarSizes: Object.freeze({
    xs:   "1.5rem",  // 24px
    sm:   "2rem",    // 32px
    md:   "2.5rem",  // 40px
    lg:   "3rem",    // 48px
    xl:   "4rem",    // 64px
    "2xl": "5rem",   // 80px
  }),

  buttonHeights: Object.freeze({
    sm: "2rem",      // 32px
    md: "2.5rem",    // 40px
    lg: "3rem",      // 48px
    xl: "3.5rem",    // 56px
  }),

  inputHeights: Object.freeze({
    sm: "2rem",      // 32px
    md: "2.5rem",    // 40px
    lg: "3rem",      // 48px
    xl: "3.5rem",    // 56px
  }),

  sidebarWidth: Object.freeze({
    collapsed: "4rem",   // 64px
    expanded:  "16.25rem", // 260px
  }),

  headerHeight: Object.freeze({
    default: "4rem",  // 64px
  }),
});
