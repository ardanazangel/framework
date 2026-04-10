import { emit } from './lifecycle.js'

// --- schemas ---

export const schemas = {
  contact: {
    action: '/api/contact',
    fields: [
      { name: 'name',    type: 'text',     label: 'Name',    required: true },
      { name: 'email',   type: 'email',    label: 'Email',   required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: true, minLength: 10 },
    ],
  },
  login: {
    action: '/api/login',
    fields: [
      { name: 'email',    type: 'email',    label: 'Email',    required: true },
      { name: 'password', type: 'password', label: 'Password', required: true, minLength: 8 },
    ],
  },
  search: {
    action: '/api/search',
    fields: [
      { name: 'query', type: 'text', label: 'Search', required: true },
    ],
  },
}

// --- server-side ---

function renderField(field) {
  const { name, type, label, required, minLength } = field
  const attrs = [
    `name="${name}"`,
    `id="field-${name}"`,
    required ? 'required' : '',
    minLength ? `minlength="${minLength}"` : '',
  ].filter(Boolean).join(' ')

  const input = type === 'textarea'
    ? `<textarea ${attrs}></textarea>`
    : `<input type="${type}" ${attrs}>`

  return `<div class="form-field" data-name="${name}">
  <label for="field-${name}">${label}</label>
  ${input}
  <span class="form-error" aria-live="polite"></span>
</div>`
}

export function renderForm(schema) {
  const fields = schema.fields.map(renderField).join('\n')
  return `${fields}
<button type="submit" class="form-submit">Send</button>
<p class="form-status" aria-live="polite"></p>`
}

// --- validation (shared server + client) ---

export function validate(field, value) {
  if (field.required && !value.trim()) return `${field.label} is required`
  if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email'
  if (field.minLength && value.length < field.minLength)
    return `Minimum ${field.minLength} characters`
  return null
}

export function hydrateForm(formEl, schema) {
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

    // validate
    let hasErrors = false
    const body = {}
    for (const field of schema.fields) {
      const el = formEl.querySelector(`[name="${field.name}"]`)
      const value = el?.value ?? ''
      const error = validate(field, value)
      setError(field.name, error)
      if (error) hasErrors = true
      else body[field.name] = value
    }
    if (hasErrors) return

    // submit
    submit.disabled = true
    setStatus('Sending...')
    emit('form:submit', { action: schema.action, body })

    try {
      const res = await fetch(schema.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(await res.text())

      setStatus('Sent!')
      formEl.reset()
      emit('form:success', { action: schema.action })
    } catch (err) {
      setStatus(err.message || 'Something went wrong', true)
      emit('form:error', { action: schema.action, error: err })
    } finally {
      submit.disabled = false
    }
  })

  // clear field error on input
  for (const field of schema.fields) {
    const el = formEl.querySelector(`[name="${field.name}"]`)
    el?.addEventListener('input', () => setError(field.name, null))
  }
}
