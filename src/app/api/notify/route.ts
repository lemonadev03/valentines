export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Response.json({ error: "Missing Telegram config" }, { status: 500 });
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "She pressed the button! 💌",
          }),
        }
      );
      if (res.ok) return Response.json({ ok: true });
    } catch {
      // retry after a short delay
    }
    if (attempt < maxRetries - 1) await new Promise((r) => setTimeout(r, 2000));
  }

  return Response.json({ error: "Failed after retries" }, { status: 502 });
}
