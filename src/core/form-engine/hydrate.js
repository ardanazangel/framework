// Client-side form hydration

import { schemas } from './schemas.js'
import { validate } from './validate.js'

const dispatch = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))

function hydrateForm(formEl, schema) {
  if (!formEl) return

  const status = formEl.querySelector('.form-status')
  const submit = formEl.querySelector('.form-submit')

  function getField(name) {
    return formEl.querySelector(`[data-name="${name}"]`)
  }

  function setError(name, msg) {
    const wrapper = getField(name)
    if (!wrapper) return
    wrapper.querySelector('.form-error').textContent = msg ?? ''
    wrapper.classList.toggle('form-field--error', !!msg)
  }

  function setStatus(msg, isError = false) {
    status.textContent = msg
    status.classList.toggle('form-status--error', isError)
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault()

    const body = {}
    for (const field of schema.fields) {
      const el = formEl.querySelector(`[name="${field.name}"]`)
      body[field.name] = field.type === 'checkbox' ? (el?.checked ? 'on' : '') : (el?.value ?? '')
    }

    let hasErrors = false
    for (const field of schema.fields) {
      const error = validate(field, body[field.name], body)
      setError(field.name, error)
      if (error) { hasErrors = true; delete body[field.name] }
    }
    if (hasErrors) return

    submit.disabled = true
    setStatus('Sending...')
    dispatch('form:submit', { action: schema.action, body })

    try {
      const res = await fetch(schema.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())

      setStatus('Sent!')
      formEl.reset()
      dispatch('form:success', { action: schema.action })
    } catch (err) {
      setStatus(err.message || 'Something went wrong', true)
      dispatch('form:error', { action: schema.action, error: err })
    } finally {
      submit.disabled = false
    }
  })

  for (const field of schema.fields) {
    const el = formEl.querySelector(`[name="${field.name}"]`)
    el?.addEventListener('input', () => setError(field.name, null))
  }
}

export const form = {
  on() {
    for (const el of document.querySelectorAll('[data-form]')) {
      const schema = schemas[el.dataset.form]
      if (!schema) { console.warn(`[form] no schema found for "${el.dataset.form}"`); continue }
      hydrateForm(el, schema)
    }
  },
  off() {},
}
