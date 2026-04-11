# Sistema del Proyecto

## TODOs y Notas

### Form Component (form.js)
- **TODO**: Crear tests para validación de form schemas
  - Tests para nuevos tipos de campos: `tel`, `number`, `checkbox`, `select`
  - Tests para reglas de validación: `minLength`, `maxLength`, `pattern`, `min`, `max`
  - Tests para cada uno de los 4 schemas nuevos: `signup`, `newsletter`, `profile`, `feedback`
  - Verificar que `renderField()` maneja correctamente cada tipo
  - Verificar que `validate()` rechaza/acepta valores correctamente
  - Tests de integración en `hydrateForm()` con nuevos schemas
