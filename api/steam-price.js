const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    let lastStatus = 500;

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*"
        }
      });

      lastStatus = response.status;

      if (response.ok) {
        const data = await response.json();

        if (data && data.success) {
          res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
          );
          return res.status(200).json(data);
        }
      }

      // Aguarda mais a cada nova tentativa para reduzir bloqueios temporários.
      await sleep(1500 * (attempt + 1));
    }

    return res.status(502).json({
      success: false,
      error: "Steam não retornou o preço após novas tentativas",
      steamStatus: lastStatus
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Erro ao consultar Steam Market"
    });
  }
}
