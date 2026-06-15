export function isBackendCompatibleEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return false;
  }
  return !domain.endsWith(".local") && !["example.com", "example.net", "example.org", "localhost"].includes(domain);
}
