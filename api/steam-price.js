const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const groupedFactoryNewCodes = new Set([
  "G180D20A6023004",
  "G183D20BE063004",
  "G18282081043004"
]);

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#36;/g, "$")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getGroupedFactoryNewPrice(code) {
  const url =
    `https://steamcommunity.com/market/listings/730/${encodeURIComponent(code)}` +
    `?category_Exterior=WearCategory0&appid=730&l=brazilian`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Steam listing HTTP ${response.status}`);
  }

  const html = await response.text();
  const plain = decodeHtml(html);

  // A página agrupada apresenta:
  // Factory New  R$ xx,xx  R$ yy,yy  Minimal Wear ...
  // Usamos o PRIMEIRO preço da linha Factory New, que corresponde
  // ao preço atual da condição Factory New exibido pela Steam.
  const match =
    plain.match(/Factory New\s+R\$\s*([0-9.]+,[0-9]{2})/i) ||
    plain.match(/Nova de Fábrica\s+R\$\s*([0-9.]+,[0-9]{2})/i);

  if (!match) {
    throw new Error("Preço Factory New não encontrado na página agrupada");
  }

  return `R$ ${match[1]}`;
}

export default async function handler(req, res) {
  const { item } = req.query;

  if (!item) {
    return res.status(400).json({
      success: false,
      error: "Item não informado"
    });
  }

  try {
    if (groupedFactoryNewCodes.has(item)) {
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const price = await getGroupedFactoryNewPrice(item);

          res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
          );

          return res.status(200).json({
            success: true,
            lowest_price: price,
            median_price: price,
            volume: "--",
            source_mode: "factory_new_group_page"
          });
        } catch (error) {
          lastError = error;
          await sleep(1500 * (attempt + 1));
        }
      }

      return res.status(502).json({
        success: false,
        error: lastError?.message || "Erro ao obter Factory New"
      });
    }

    const url =
      "https://steamcommunity.com/market/priceoverview/" +
      "?appid=730" +
      "&currency=7" +
      "&market_hash_name=" +
      encodeURIComponent(item);

    let lastStatus = 500;

    for (let attempt = 0; attempt < 4; attempt++) {
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

      await sleep(2000 * (attempt + 1));
    }

    return res.status(502).json({
      success: false,
      error: "Steam não retornou o preço após novas tentativas",
      steamStatus: lastStatus
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao consultar Steam Market"
    });
  }
}
