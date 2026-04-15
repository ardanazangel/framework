// Validation — shared between server and client

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
