/**
 * @preone/ui — IconButton Stories
 *
 * Comprehensive Storybook stories for the IconButton component,
 * covering all variants, sizes, and composition patterns.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './icon-button';
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Settings,
  Bell,
  Star,
  Heart,
  Share2,
  Download,
  Copy,
  X,
  Check,
  MoreHorizontal,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof IconButton> = {
  title: 'UI/Buttons/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      description: 'Lucide icon component',
    },
    label: {
      control: 'text',
      description: 'Accessible label (aria-label)',
    },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'],
      description: 'Visual style variant',
      table: {
        defaultValue: { summary: 'ghost' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
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
    onClick: {
      action: 'clicked',
      description: 'Click handler',
    },
  },
  args: {
    label: 'Edit',
    variant: 'ghost',
    size: 'default',
    loading: false,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

// ---------------------------------------------------------------------------
// Basic Stories
// ---------------------------------------------------------------------------

/** Ghost icon button — the default, subtle style. */
export const Ghost: Story = {
  args: {
    icon: Pencil,
    label: 'Edit item',
    variant: 'ghost',
  },
};

/** Default (filled) icon button — for primary icon actions. */
export const Filled: Story = {
  args: {
    icon: Plus,
    label: 'Add item',
    variant: 'default',
  },
};

/** Secondary icon button. */
export const Secondary: Story = {
  args: {
    icon: Star,
    label: 'Favourite',
    variant: 'secondary',
  },
};

/** Outline icon button. */
export const Outline: Story = {
  args: {
    icon: Search,
    label: 'Search',
    variant: 'outline',
  },
};

/** Destructive icon button — for danger actions. */
export const Destructive: Story = {
  args: {
    icon: Trash2,
    label: 'Delete item',
    variant: 'destructive',
  },
};

// ---------------------------------------------------------------------------
// Size Stories
// ---------------------------------------------------------------------------

/** Small icon button — 32×32px. */
export const Small: Story = {
  args: {
    icon: Settings,
    label: 'Settings',
    size: 'sm',
  },
};

/** Default icon button — 40×40px. */
export const DefaultSize: Story = {
  args: {
    icon: Bell,
    label: 'Notifications',
    size: 'default',
  },
};

/** Large icon button — 48×48px. */
export const Large: Story = {
  args: {
    icon: Plus,
    label: 'Add new',
    size: 'lg',
  },
};

// ---------------------------------------------------------------------------
// State Stories
// ---------------------------------------------------------------------------

/** Loading state — shows spinner instead of icon. */
export const Loading: Story = {
  args: {
    icon: Download,
    label: 'Download',
    loading: true,
  },
};

/** Disabled state. */
export const Disabled: Story = {
  args: {
    icon: Pencil,
    label: 'Edit',
    disabled: true,
  },
};

/** Loading destructive button. */
export const LoadingDestructive: Story = {
  args: {
    icon: Trash2,
    label: 'Delete',
    variant: 'destructive',
    loading: true,
  },
};

// ---------------------------------------------------------------------------
// Gallery Stories
// ---------------------------------------------------------------------------

/** All variants displayed side by side. */
export const VariantGallery: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <IconButton icon={Plus} label="Add" variant="default" />
      <IconButton icon={Star} label="Favourite" variant="secondary" />
      <IconButton icon={Search} label="Search" variant="outline" />
      <IconButton icon={Pencil} label="Edit" variant="ghost" />
      <IconButton icon={Trash2} label="Delete" variant="destructive" />
    </div>
  ),
};

/** All sizes displayed side by side. */
export const SizeGallery: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <IconButton icon={Plus} label="Add small" size="sm" />
      <IconButton icon={Plus} label="Add default" size="default" />
      <IconButton icon={Plus} label="Add large" size="lg" />
    </div>
  ),
};

/** Common toolbar pattern with icon buttons. */
export const ToolbarPattern: Story = {
  render: () => (
    <div
      style={{
        display: 'inline-flex',
        gap: '2px',
        padding: '4px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--background)',
      }}
      role="toolbar"
      aria-label="Text formatting"
    >
      <IconButton icon={Pencil} label="Edit" variant="ghost" size="sm" />
      <IconButton icon={Copy} label="Copy" variant="ghost" size="sm" />
      <IconButton icon={Share2} label="Share" variant="ghost" size="sm" />
      <IconButton icon={Trash2} label="Delete" variant="ghost" size="sm" />
    </div>
  ),
};

/** Action row pattern — common in list items and cards. */
export const ActionRow: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <IconButton icon={Heart} label="Like" variant="ghost" />
      <IconButton icon={Share2} label="Share" variant="ghost" />
      <IconButton icon={MoreHorizontal} label="More options" variant="ghost" />
    </div>
  ),
};

/** Confirmation pattern with success and cancel. */
export const ConfirmationPattern: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <IconButton icon={Check} label="Confirm" variant="default" />
      <IconButton icon={X} label="Cancel" variant="ghost" />
    </div>
  ),
};

/** All variant × size combinations. */
export const FullMatrix: Story = {
  render: () => {
    const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive'] as const;
    const sizes = ['sm', 'default', 'lg'] as const;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sizes.map((size) => (
          <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <span style={{ width: '80px', fontWeight: 600, fontSize: '14px', color: 'var(--muted-foreground)' }}>
              {size}
            </span>
            {variants.map((variant) => (
              <IconButton
                key={`${variant}-${size}`}
                icon={Star}
                label={`${variant} ${size}`}
                variant={variant}
                size={size}
              />
            ))}
          </div>
        ))}
      </div>
    );
  },
};
