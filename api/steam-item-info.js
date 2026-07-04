export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("https://steamcommunity.com/market/listings/730/")) {
    return res.status(400).json({ success: false, error: "Link inválido" });
  }

  try {
    const parsed = new URL(url);
    const marketName = decodeURIComponent(parsed.pathname.split("/").pop());

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: "Steam não respondeu à consulta" });
    }

    const html = await response.text();

    const titleMatch =
      html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<title>([^<]+)<\/title>/i);

    let name = titleMatch ? titleMatch[1] : marketName;
    name = name
      .replace(/\s*-\s*Steam Community Market.*$/i, "")
      .replace(/\s*on Steam Community Market.*$/i, "")
      .replace(/&amp;/g, "&")
      .trim();

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({
      success: true,
      name,
      marketName
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Erro ao identificar o item"
    });
  }
}
