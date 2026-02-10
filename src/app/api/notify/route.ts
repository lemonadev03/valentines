export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Response.json({ error: "Missing Telegram config" }, { status: 500 });
  }

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

  if (!res.ok) {
    return Response.json({ error: "Failed to send" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
