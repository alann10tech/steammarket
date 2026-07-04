export default async function handler(req, res) {
  const { item } = req.query;

  if (!item) {
    return res.status(400).json({
      success: false,
      error: "Item não informado"
    });
  }

  const listingUrl =
    "https://steamcommunity.com/market/listings/730/" +
    encodeURIComponent(item);

  try {
    const response = await fetch(listingUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();

    const match =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: "Imagem não encontrada"
      });
    }

    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).json({
      success: true,
      image: match[1].replace(/&amp;/g, "&")
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar imagem do item"
    });
  }
}
