import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'smartpos-point-of-sale-system-u7lvjait',
  authRequired: true
})

export default blink