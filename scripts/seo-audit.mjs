const baseUrl = process.env.SEO_BASE_URL || "http://localhost:3000";
const PROD_URL = "https://www.vosmart.ro";

function decode(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function match(html, expression) {
  return decode(html.match(expression)?.[1]?.trim() || "");
}

const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`);
if (!sitemapResponse.ok) throw new Error(`Sitemap indisponibil: HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const productionUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(result => result[1]);
const urls = productionUrls.map(url => url.replace(PROD_URL, baseUrl));

const failures = [];
const rows = [];

for (const url of urls) {
  const response = await fetch(url, { redirect: "manual" });
  const html = await response.text();
  const title = match(html, /<title>(.*?)<\/title>/is);
  const description = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || match(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const jsonLdCount = (html.match(/application\/ld\+json/gi) || []).length;
  const path = new URL(url).pathname;
  const issues = [];

  if (response.status !== 200) issues.push(`HTTP ${response.status}`);
  if (!title || title.length < 20 || title.length > 65) issues.push(`title ${title.length || 0} caractere`);
  if (!description || description.length < 70 || description.length > 170) issues.push(`description ${description.length || 0} caractere`);
  if (!canonical) issues.push("canonical lipsă");
  if (h1Count !== 1) issues.push(`${h1Count} elemente H1`);
  if (jsonLdCount === 0) issues.push("JSON-LD lipsă");

  rows.push({ path, status: response.status, title: title.length, description: description.length, h1: h1Count, jsonLd: jsonLdCount, result: issues.length ? "FAIL" : "OK" });
  if (issues.length) failures.push({ path, issues });
}

console.table(rows);
if (failures.length) {
  console.error("\nProbleme SEO detectate:");
  for (const failure of failures) console.error(`- ${failure.path}: ${failure.issues.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`\nAudit SEO trecut: ${rows.length} URL-uri verificate.`);
}
