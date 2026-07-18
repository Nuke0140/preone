import type { Preview } from '@storybook/react';
import { withDesignTokens } from '../src/decorators/with-design-tokens';

const preview: Preview = {
  decorators: [withDesignTokens],
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    options: {
      storySort: {
        method: 'alphabetical',
      },
    },
  },
};

export default preview;
