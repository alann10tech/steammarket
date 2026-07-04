const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const factoryNewGroupedCodes = new Set([
  "G180D20A6023004",
  "G183D20BE063004",
  "G18282081043004"
]);

async function getFactoryNewPrice(groupCode) {
  const url =
    "https://steamcommunity.com/market/listings/730/" +
    encodeURIComponent(groupCode) +
    "?category_Exterior=WearCategory0&appid=730&l=brazilian";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!response.ok) return null;

  const html = await response.text();

  // A tabela de variações do novo Market mostra Factory New/Nova de Fábrica
  // antes das outras condições. Captura somente o bloco dessa primeira condição.
  const labels = ["Nova de Fábrica", "Factory New", "Original de Fábrica"];
  let start = -1;

  for (const label of labels) {
    const pos = html.indexOf(label);
    if (pos !== -1 && (start === -1 || pos < start)) start = pos;
  }

  if (start === -1) return null;

  const section = html.slice(start, start + 5000);

  const matches = [...section.matchAll(/R\$\s*([0-9.]+,[0-9]{2})/g)];
  if (!matches.length) return null;

  // Primeiro valor BRL exibido no bloco Factory New.
  return "R$ " + matches[0][1];
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
    if (factoryNewGroupedCodes.has(item)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const price = await getFactoryNewPrice(item);

        if (price) {
          res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
          return res.status(200).json({
            success: true,
            lowest_price: price,
            median_price: price,
            volume: "--",
            source_mode: "grouped_factory_new"
          });
        }

        await sleep(1500 * (attempt + 1));
      }

      return res.status(502).json({
        success: false,
        error: "Não foi possível obter o preço Factory New"
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
          res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
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
      error: "Erro ao consultar Steam Market"
    });
  }
}
