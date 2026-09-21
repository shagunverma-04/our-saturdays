export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "still up? 🌙";
  if (h < 12) return "good morning ☀️";
  if (h < 17) return "good afternoon 🌤️";
  if (h < 21) return "good evening 🌆";
  return "good night 🌙";
}
