import assert from 'node:assert/strict'
import { test } from 'node:test'

import { name, inject, apply, EngramSettingsView } from './client.ts'

test('client export contract', () => {
  assert.equal(name, 'dsh-gentle-engram')
  assert.ok(inject.includes('slots'))
  assert.ok(inject.includes('locale'))
  assert.equal(typeof EngramSettingsView, 'function')
})

test('apply registers settings.section and settings.plugins.tab', () => {
  const registeredSlots: Array<{ name: string; options: Record<string, unknown>; component: unknown }> = []
  const injectedSlots: string[] = []

  const mockCtx = {
    slots: {
      inject(slotName: string, callback: () => void) {
        injectedSlots.push(slotName)
        callback()
      },
      register(options: Record<string, unknown>, component: unknown) {
        registeredSlots.push({ name: String(options.name), options, component })
      },
    },
  }

  apply(mockCtx)

  assert.ok(injectedSlots.includes('settings.section'))
  assert.ok(injectedSlots.includes('settings.plugins.tab'))

  const section = registeredSlots.find((r) => r.name === 'settings.section')
  assert.ok(section)
  assert.equal(section.options.id, 'engram')
  assert.equal((section.options.label as () => string)(), 'Engram Memory')
  assert.equal(section.component, EngramSettingsView)

  const tab = registeredSlots.find((r) => r.name === 'settings.plugins.tab')
  assert.ok(tab)
  assert.equal(tab.options.id, 'engram')
  assert.equal((tab.options.label as () => string)(), 'Engram Memory')
  assert.equal(tab.component, EngramSettingsView)
})
