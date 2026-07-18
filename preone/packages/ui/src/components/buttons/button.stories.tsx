/**
 * @preone/ui — Button Stories
 *
 * Comprehensive Storybook stories for the Button component,
 * covering all variants, sizes, states, and composition patterns.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Loader2, Mail, ChevronRight, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof Button> = {
  title: 'UI/Buttons/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'],
      description: 'Visual style variant',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
      description: 'Button size',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (Slot)',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler',
    },
  },
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
    loading: false,
    disabled: false,
    asChild: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ---------------------------------------------------------------------------
// Variant Stories
// ---------------------------------------------------------------------------

/** Default primary button — the main call-to-action. */
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Primary Action',
  },
};

/** Secondary button — for secondary actions. */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Action',
  },
};

/** Outline button — bordered, no fill. */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Action',
  },
};

/** Ghost button — no border, no fill. */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Action',
  },
};

/** Link button — appears as a text link. */
export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Action',
  },
};

/** Destructive button — for dangerous or irreversible actions. */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Account',
  },
};

// ---------------------------------------------------------------------------
// Size Stories
// ---------------------------------------------------------------------------

/** Small size — compact for dense layouts. */
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

/** Default size — standard button. */
export const DefaultSize: Story = {
  args: {
    size: 'default',
    children: 'Default Button',
  },
};

/** Large size — prominent for hero sections. */
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

/** Icon size — square button for icon-only usage. */
export const IconSize: Story = {
  args: {
    size: 'icon',
    children: <Mail size={18} />,
  },
};

// ---------------------------------------------------------------------------
// State Stories
// ---------------------------------------------------------------------------

/** Loading state — shows spinner, prevents interaction. */
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Saving Changes…',
  },
};

/** Disabled state — greyed out, no interaction. */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

/** Loading state on destructive variant. */
export const LoadingDestructive: Story = {
  args: {
    variant: 'destructive',
    loading: true,
    children: 'Deleting…',
  },
};

// ---------------------------------------------------------------------------
// Composition Stories
// ---------------------------------------------------------------------------

/** Button with a left icon. */
export const WithLeftIcon: Story = {
  args: {
    children: (
      <>
        <Mail size={16} aria-hidden="true" />
        Send Email
      </>
    ),
  },
};

/** Button with a right icon. */
export const WithRightIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ArrowRight size={16} aria-hidden="true" />
      </>
    ),
  },
};

/** Button with both icons. */
export const WithBothIcons: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <Mail size={16} aria-hidden="true" />
        Compose
        <ChevronRight size={16} aria-hidden="true" />
      </>
    ),
  },
};

// ---------------------------------------------------------------------------
// Variant Gallery
// ---------------------------------------------------------------------------

/** All variants displayed side by side for comparison. */
export const VariantGallery: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

/** All sizes displayed side by side for comparison. */
export const SizeGallery: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Mail size={18} /></Button>
    </div>
  ),
};

/** All states displayed side by side. */
export const StateGallery: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <Button>Normal</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
      <Button variant="destructive" loading>Deleting</Button>
    </div>
  ),
};

/** All variant × size combinations. */
export const FullMatrix: Story = {
  render: () => {
    const variants = ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'] as const;
    const sizes = ['sm', 'default', 'lg'] as const;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sizes.map((size) => (
          <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <span style={{ width: '80px', fontWeight: 600, fontSize: '14px', color: 'var(--muted-foreground)' }}>
              {size}
            </span>
            {variants.map((variant) => (
              <Button key={`${variant}-${size}`} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
          </div>
        ))}
      </div>
    );
  },
};

/** Loading states across all variants. */
export const LoadingGallery: Story = {
  render: () => {
    const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive'] as const;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {variants.map((variant) => (
          <Button key={variant} variant={variant} loading>
            {variant}
          </Button>
        ))}
      </div>
    );
  },
};
