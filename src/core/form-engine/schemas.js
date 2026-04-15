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
