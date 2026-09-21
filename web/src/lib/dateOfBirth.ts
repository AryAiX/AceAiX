export function validateDateOfBirth(value: string, today = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Enter your date of birth in YYYY-MM-DD format.';
  }

  const [year, month, day] = value.split('-').map(Number);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return 'Enter a real calendar date.';
  }

  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  if (
    year > todayYear ||
    (year === todayYear && (month > todayMonth || (month === todayMonth && day > todayDay)))
  ) {
    return 'Date of birth cannot be in the future.';
  }

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age < 13 ? 'You must be at least 13 years old to create an account.' : null;
}
