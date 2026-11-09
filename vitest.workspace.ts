import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: 'packages/shared',
      include: ['**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'api',
      root: 'apps/api',
      include: ['**/*.test.ts'],
    },
  },
])
