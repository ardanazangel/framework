// Server-side form rendering

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
