export default async function handler(req, res) {
  const { item } = req.query;

  if (!item) {
    return res.status(400).json({
      success: false,
      error: "Item não informado"
    });
  }

  const url =
    "https://steamcommunity.com/market/priceoverview/" +
    "?appid=730" +
    "&currency=7" +
    "&market_hash_name=" +
    encodeURIComponent(item);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const data = await response.json();

    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate"
    );

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Erro ao consultar Steam Market"
    });
  }
}
