// End-to-end check of ChipKili in a real browser (Playwright), dry-run texting.
// Usage: BASE_URL=http://localhost:3217 ADMIN_PW_FILE=<file> SHOTS=<dir> node scripts/test/e2e.cjs
// Needs: NOTIFY_MODE=dry and DEV_SHOW_CODE=1 on the server (the test reads the code the page shows).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { authenticator } = require(path.join(__dirname, "..", "..", "node_modules", "otplib"));

const TEST_PHONE = `201555${String(Math.floor(1000 + Math.random() * 8999))}`;
const TEST_E164 = `+1${TEST_PHONE}`;
const BASE = process.env.BASE_URL || "http://localhost:3217";
// Admin runs on its own address (like admin.chipkili.com); locally 127.0.0.1 plays that part
const ADMIN = process.env.ADMIN_URL || "http://127.0.0.1:3217";
const SHOTS = process.env.SHOTS || path.join(__dirname, "shots");
const ROOT = path.join(__dirname, "..", "..");
fs.mkdirSync(SHOTS, { recursive: true });

function env(name) {
  const line = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1) : "";
}
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const outbox = () => {
  try {
    return fs.readFileSync(path.join(ROOT, "data", "outbox.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && /Content Security Policy|Refused to/.test(m.text()) && errors.push(`CSP: ${m.text().slice(0, 160)}`));

  // 1. Home and search, filters live in the address
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  check("home shows listings", (await page.locator("main a[href^='/i/']").count()) >= 12);
  await page.getByRole("button", { name: "Yes, remember" }).click();
  await page.getByRole("combobox", { name: "Search listings" }).first().fill("thinkpad");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/search\?q=thinkpad/);
  await page.waitForLoadState("networkidle");
  const n = await page.locator("main ul a[href^='/i/']").count();
  check("search 'thinkpad' finds laptops", n >= 3, `${n} results`);
  await page.goto(`${BASE}/search?q=keybord`, { waitUntil: "networkidle" });
  check("typo 'keybord' still finds keyboards", (await page.locator("main ul a[href^='/i/']").count()) >= 3);
  await page.goto(`${BASE}/c/computers?max=20&sort=price-asc`, { waitUntil: "networkidle" });
  const prices = await page.locator("main ul li a[href^='/i/'] p.font-bold").allInnerTexts();
  const nums = prices.map((p) => Number((p.match(/\$([\d,]+(?:\.\d+)?)/) || [])[1]?.replace(/,/g, "")));
  check("category + max price + sort filter", nums.length > 0 && nums.every((x) => x <= 20) && nums.every((x, i) => i === 0 || x >= nums[i - 1]), `${nums.length} items`);
  await page.screenshot({ path: path.join(SHOTS, "01_category_filtered.png") });

  // 2. Product page and message flow with phone code
  await page.goto(`${BASE}/search?q=thinkpad`, { waitUntil: "networkidle" });
  await page.locator("main ul a[href^='/i/']").first().click();
  await page.waitForURL(/\/i\//);
  await page.waitForLoadState("networkidle");
  const title = await page.locator("h1").innerText();
  check("product page opens", title.length > 5, title.slice(0, 50));
  const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
  check("product data for Google on page", ld.some((t) => t.includes('"@type":"Product"') && t.includes('"price"')));
  await page.screenshot({ path: path.join(SHOTS, "02_product.png") });
  const before = outbox().length;
  const form = page.locator("form").filter({ has: page.getByText("Send code to my phone") }).first();
  await form.getByLabel("Your name").fill("Test Buyer");
  await form.getByPlaceholder("(201) 555-0123").fill(TEST_PHONE);
  await form.getByRole("button", { name: "Send code to my phone" }).click();
  await page.getByLabel("6-digit code").waitFor();
  // the code as the phone would receive it: the last code text in the dry-run outbox
  const code = outbox().filter((m) => m.channel === "sms" && m.to === TEST_E164 && /code is \d{6}/.test(m.text)).pop().text.match(/\d{6}/)[0];
  await page.getByLabel("6-digit code").fill("000000");
  await page.getByRole("button", { name: "Verify and send" }).click();
  check("wrong code is refused", await page.getByText("That code is not right").waitFor({ timeout: 10000 }).then(() => true, () => false));
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Verify and send" }).click();
  await page.getByText("Sent! Kili delivered it.").first().waitFor();
  await page.screenshot({ path: path.join(SHOTS, "03_message_sent.png") });
  const sent = outbox().slice(before);
  check("code text written to outbox (dry run)", sent.some((m) => m.channel === "sms" && m.to === TEST_E164 && /code is \d{6}/.test(m.text)));
  check("lead alert text to Aamir's cell", sent.some((m) => m.channel === "sms" && m.to === "+12013444230" && m.text.startsWith("ChipKili lead: Test")));
  check("auto thank-you text to buyer", sent.some((m) => m.channel === "sms" && m.to === TEST_E164 && m.text.startsWith("Thanks Test, Kili got your message")));
  check("lead email to Aamir", sent.some((m) => m.channel === "email" && m.to === "aamirarif@gmail.com"));

  // 3. Same device stays verified; Sell to ChipKili with a photo
  await page.goto(`${BASE}/sell`, { waitUntil: "networkidle" });
  check("sell form knows the verified phone", await page.getByText("Verified on this device").isVisible());
  const sell = page.locator("form").filter({ has: page.getByText("Send for an offer") });
  await sell.getByLabel("What do you want to sell?").fill("Two True reach-in coolers, 2 doors");
  await sell.getByLabel("Your name").fill("Test Owner");
  await sell.getByLabel("Town or ZIP").fill("Hackensack");
  await sell.getByLabel("Category").selectOption({ index: 1 });
  await sell.getByLabel("Condition").selectOption("Good");
  await sell.getByLabel("Does it work?").selectOption("Yes");
  await sell.getByLabel("I own these items or am allowed to sell them.").check();
  await sell.locator('input[type="file"]').setInputFiles(path.join(ROOT, "public", "kili", "box.webp"));
  await sell.getByRole("button", { name: "Send for an offer" }).click();
  await page.getByText("Sent! Kili is on it.").waitFor();
  check("sell request with photo sent", true);

  // 4. Share this search
  await page.goto(`${BASE}/search?q=keyboard&max=15`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Share this search" }).click();
  check("share sheet opens on a search", await page.getByText("Every share link carries a source tag").isVisible());
  await page.screenshot({ path: path.join(SHOTS, "04_share_search.png") });

  // 5. Admin: sign in with password + authenticator code
  const admin = await ctx.newPage();
  admin.on("pageerror", (e) => errors.push(`admin: ${e.message}`));
  admin.on("console", (m) => m.type() === "error" && /Content Security Policy|Refused to/.test(m.text()) && errors.push(`admin CSP: ${m.text().slice(0, 160)}`));
  const pub = await page.goto(`${BASE}/admin`);
  check("admin is closed on the public address", pub.status() === 404);
  await admin.goto(`${ADMIN}/`, { waitUntil: "networkidle" });
  check("admin address asks for sign-in", admin.url().endsWith("/admin/login"));
  // step 1: wrong password is refused
  await admin.getByLabel("Password").fill("not-the-password");
  await admin.getByRole("button", { name: "Continue" }).click();
  check("wrong admin password refused", await admin.getByText("User or password is not right.").waitFor({ timeout: 10000 }).then(() => true, () => false));
  // step 1: right password -> a code is texted to the owner's phone
  await admin.getByLabel("Password").fill(fs.readFileSync(process.env.ADMIN_PW_FILE, "utf8").trim());
  await admin.getByRole("button", { name: "Continue" }).click();
  await admin.getByLabel("Code").waitFor();
  const adminCode = () =>
    outbox().filter((m) => m.channel === "sms" && m.to === "+12013444230" && /Admin sign-in code: \d{6}/.test(m.text)).pop().text.match(/\d{6}/)[0];
  check("admin code also emailed as backup", outbox().some((m) => m.channel === "email" && /Admin sign-in code/.test(m.subject)));
  await admin.getByLabel("Code").fill(adminCode() === "000000" ? "111111" : "000000");
  await admin.getByRole("button", { name: "Sign in" }).click();
  check("wrong admin code refused", await admin.getByText("That code is not right").waitFor({ timeout: 10000 }).then(() => true, () => false));
  await admin.getByLabel("Code").fill(adminCode());
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL(`${ADMIN}/admin`);
  const sellLead = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "db.json"), "utf8")).leads)
    .filter((l) => l.type === "sell").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const privSrc = sellLead.media[0].thumb;
  const stranger = await (await browser.newContext()).request.get(`${BASE}${privSrc}`);
  check("sell-request photo hidden from strangers", privSrc.startsWith("/media/p/") && stranger.status() === 404, privSrc);
  // from inside the signed-in admin page, exactly as the lead page loads it
  const ownerStatus = await admin.evaluate(async (src) => (await fetch(src, { credentials: "same-origin" })).status, privSrc);
  check("sell-request photo visible to the signed-in owner", ownerStatus === 200, String(ownerStatus));
  check("admin dashboard shows the new lead", await admin.getByText("Test Buyer").first().waitFor({ timeout: 15000 }).then(() => true, () => false));
  await admin.screenshot({ path: path.join(SHOTS, "05_admin_dashboard.png") });

  // 6. Create, publish, price-drop and sell a listing
  await admin.goto(`${ADMIN}/admin/items/new`, { waitUntil: "networkidle" });
  await admin.locator('input[type="file"]').setInputFiles([path.join(ROOT, "public", "kili", "box.webp"), path.join(ROOT, "public", "kili", "deal.webp")]);
  await admin.getByText("Cover", { exact: true }).first().waitFor();
  await admin.getByText("Add photos or video").waitFor();
  await admin.getByLabel("Title (Brand, Type, Model first)").fill("Test Brand Test Fridge TF-100 Stainless");
  await admin.getByLabel("Category").selectOption("refrigerators");
  await admin.getByLabel("Brand", { exact: true }).fill("Test Brand");
  await admin.getByLabel("Price ($)", { exact: true }).fill("500");
  await admin.getByLabel("Description", { exact: true }).fill("A test fridge used to check the admin. Works fine. Sold as-is.");
  await admin.getByRole("button", { name: "Save and publish" }).click();
  await admin.waitForURL(/\/admin\/items\/CK-\d+/);
  const itemUrl = admin.url();
  check("listing created and published", /CK-\d+/.test(itemUrl), itemUrl.split("/").pop());
  const savedMedia = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "db.json"), "utf8")).items[itemUrl.split("/").pop()].media.length;
  check("both uploaded photos saved with the listing", savedMedia === 2, `${savedMedia} photos`);
  await admin.screenshot({ path: path.join(SHOTS, "06_admin_editor.png"), fullPage: false });
  await admin.getByLabel("Price ($)", { exact: true }).fill("420");
  await admin.getByRole("button", { name: "Save", exact: true }).click();
  await admin.getByText("Saved.", { exact: true }).waitFor();
  await page.goto(`${BASE}/price-drops`, { waitUntil: "networkidle" });
  check("price cut shows in Price drops", await page.getByText("Test Brand Test Fridge").first().isVisible());
  const newSlug = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "db.json"), "utf8")).items[itemUrl.split("/").pop()].slug;
  await page.locator(`a[href="/i/${newSlug}"]`).first().click();
  await page.waitForURL(/\/i\//);
  await page.waitForLoadState("networkidle");
  check("product shows $420 with $500 crossed out", (await page.locator("aside").first().innerText()).includes("$420") && (await page.locator("aside .line-through").first().innerText()) === "$500");
  await admin.getByRole("button", { name: "Mark sold" }).click();
  await admin.getByText("Marked sold.").waitFor({ timeout: 15000 });
  let soldShown = false;
  for (let tries = 0; tries < 5 && !soldShown; tries++) {
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: "networkidle" });
    soldShown = (await page.getByText("This item is sold.").count()) > 0;
  }
  check("sold item keeps its page with a Sold banner", soldShown);
  const ck = itemUrl.split("/").pop();
  const stored = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "db.json"), "utf8")).items[ck];
  check("was-price kept after marking sold", stored && stored.status === "sold" && stored.originalPrice === 500, `${stored?.status} was ${stored?.originalPrice}`);

  // 7. Share link with click counting
  await admin.goto(`${ADMIN}/admin/shares`, { waitUntil: "networkidle" });
  await admin.getByPlaceholder("/search?q=laptop&max=100").fill("/search?q=keyboard");
  const label = `Keyboards test ${Date.now()}`;
  await admin.getByPlaceholder("Laptops under $100 for the Teaneck group").fill(label);
  await admin.getByRole("button", { name: "Create short link" }).click();
  const row = admin.locator("tr", { hasText: label });
  await row.waitFor();
  const shortUrl = (await row.locator("p.text-xs").innerText()).split(" ")[0];
  await page.goto(shortUrl, { waitUntil: "networkidle" });
  check("short link opens the search with a source tag", page.url().includes("q=keyboard") && page.url().includes("src=facebook-group"));
  await admin.reload({ waitUntil: "networkidle" });
  check("share link click counted", (await admin.locator("tr", { hasText: label }).locator("td.font-bold").innerText()) === "1");

  // 8. Phone layout
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const p = await phone.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("phone: no sideways scrolling", !overflow);
  await p.screenshot({ path: path.join(SHOTS, "07_phone_home.png") });

  check("no page errors or blocked content in the browser", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error("TEST CRASHED:", e.message);
  process.exit(2);
});
