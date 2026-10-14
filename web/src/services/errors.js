function formatErrorValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatErrorValue).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nested]) => {
        const message = formatErrorValue(nested);
        return message ? `${key}: ${message}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  const message = formatErrorValue(data?.detail ?? data?.error ?? data?.message ?? data);
  return message || fallback;
}