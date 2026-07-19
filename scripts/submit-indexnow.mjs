const SITE_URL = "https://www.vosmart.ro";
const INDEXNOW_KEY = "83a3df38b81ac93e575457ff0793d25f";
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

const sitemapResponse = await fetch(`${SITE_URL}/sitemap.xml`);

if (!sitemapResponse.ok) {
  throw new Error(`Sitemap indisponibil: HTTP ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

if (urlList.length === 0) {
  throw new Error("Sitemapul nu conține URL-uri.");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: "www.vosmart.ro",
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
});

if (![200, 202].includes(response.status)) {
  const details = await response.text();
  throw new Error(`IndexNow a răspuns HTTP ${response.status}: ${details || "fără detalii"}`);
}

console.log(`IndexNow a primit ${urlList.length} URL-uri (HTTP ${response.status}).`);
