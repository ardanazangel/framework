const dispatch = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }))

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
  signup: {
    action: '/api/signup',
    fields: [
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true, minLength: 8 },
      { name: 'confirmPassword', type: 'password', label: 'Confirm Password', required: true, minLength: 8, match: 'password' },
      { name: 'agreeTerms', type: 'checkbox', label: 'I agree to the terms and conditions', required: true },
    ],
  },
  newsletter: {
    action: '/api/newsletter',
    fields: [
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'frequency', type: 'select', label: 'Frequency', required: true, options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
      ]},
    ],
  },
  profile: {
    action: '/api/profile',
    fields: [
      { name: 'fullName', type: 'text', label: 'Full Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'phone', type: 'tel', label: 'Phone', pattern: '^[\\d\\s+\\-()]+$' },
      { name: 'bio', type: 'textarea', label: 'Bio', maxLength: 500 },
    ],
  },
  feedback: {
    action: '/api/feedback',
    fields: [
      { name: 'rating', type: 'select', label: 'Rating', required: true, options: [
        { value: '5', label: '5 - Excellent' },
        { value: '4', label: '4 - Good' },
        { value: '3', label: '3 - Average' },
        { value: '2', label: '2 - Poor' },
        { value: '1', label: '1 - Very Poor' },
      ]},
      { name: 'category', type: 'select', label: 'Category', required: true, options: [
        { value: 'bug', label: 'Bug Report' },
        { value: 'feature', label: 'Feature Request' },
        { value: 'general', label: 'General Feedback' },
      ]},
      { name: 'comment', type: 'textarea', label: 'Comment', required: true, minLength: 10, maxLength: 1000 },
    ],
  },
}

// --- server-side ---

export function renderField(field) {
  const { name, type, label, required, minLength, maxLength, min, max, pattern, options } = field
  const attrs = [
    `name="${name}"`,
    `id="field-${name}"`,
    required ? 'required' : '',
    minLength ? `minlength="${minLength}"` : '',
    maxLength ? `maxlength="${maxLength}"` : '',
    min != null ? `min="${min}"` : '',
    max != null ? `max="${max}"` : '',
    pattern ? `pattern="${pattern}"` : '',
  ].filter(Boolean).join(' ')

  let input
  if (type === 'textarea') {
    input = `<textarea ${attrs}></textarea>`
  } else if (type === 'select') {
    const optionsHtml = (options ?? []).map(o => `<option value="${o.value}">${o.label}</option>`).join('')
    input = `<select ${attrs}><option value="">— Select —</option>${optionsHtml}</select>`
  } else if (type === 'checkbox') {
    input = `<input type="checkbox" name="${name}" id="field-${name}" value="on"${required ? ' required' : ''}>`
  } else {
    input = `<input type="${type}" ${attrs}>`
  }

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

export function validate(field, value, allValues = {}) {
  if (field.required && !value.trim()) return `${field.label} is required`
  if (!value) return null
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email'
  if (field.minLength && value.length < field.minLength)
    return `Minimum ${field.minLength} characters`
  if (field.maxLength && value.length > field.maxLength)
    return `Maximum ${field.maxLength} characters`
  if (field.pattern && !new RegExp(field.pattern).test(value))
    return `${field.label} format is invalid`
  if (field.min != null && Number(value) < field.min)
    return `Minimum value is ${field.min}`
  if (field.max != null && Number(value) > field.max)
    return `Maximum value is ${field.max}`
  if (field.match && allValues[field.match] !== value)
    return `${field.label} does not match`
  return null
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

    // collect values first (needed for match validation)
    const body = {}
    for (const field of schema.fields) {
      const el = formEl.querySelector(`[name="${field.name}"]`)
      body[field.name] = field.type === 'checkbox' ? (el?.checked ? 'on' : '') : (el?.value ?? '')
    }

    // validate
    let hasErrors = false
    for (const field of schema.fields) {
      const error = validate(field, body[field.name], body)
      setError(field.name, error)
      if (error) { hasErrors = true; delete body[field.name] }
    }
    if (hasErrors) return

    // submit
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

  // clear field error on input
  for (const field of schema.fields) {
    const el = formEl.querySelector(`[name="${field.name}"]`)
    el?.addEventListener('input', () => setError(field.name, null))
  }
}
