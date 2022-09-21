import type { UserConfig } from '@unocss/core';
import presetUno from '@unocss/preset-uno';

// @ref https://github.com/unocss/unocss#configurations
export default <UserConfig> {
  presets: [presetUno({
    // dark: "media",
  })],
  rules: [
    ['bg-banner', {
      'background-image': 'url(assets/pexels-salvatore-de-lellis-9683980.jpg)',
    }],
  ],
  shortcuts: {
    'bg-success': 'bg-lime-300 ',
    'bg-warning': 'bg-yellow-300 ',
    'bg-danger': 'bg-orange-300 ',
    'bg-error': 'bg-red-400 ',
    'success': 'text-lime-500 ',
    'warning': 'text-yellow-500 ',
    'danger': 'text-orange-500 ',
    'error': 'text-red-600 ',
    'link': 'text-blue-500 underline ',
  },
};
