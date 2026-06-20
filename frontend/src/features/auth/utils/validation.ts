export function isBackendCompatibleEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";
  // 本地保留域名会让后端联调和邮箱唯一性演示失真，因此在前端先拦掉。
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return false;
  }
  return !domain.endsWith(".local") && !["example.com", "example.net", "example.org", "localhost"].includes(domain);
}
