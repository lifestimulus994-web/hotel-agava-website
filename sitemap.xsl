<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-readable skin for sitemap.xml.

  Browsers apply this via the <?xml-stylesheet?> instruction at the top of
  sitemap.xml and render the table below. Crawlers ignore processing
  instructions entirely, so Googlebot still parses the raw XML unchanged —
  this file changes appearance only, never the data.
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

<xsl:output method="html" version="5" encoding="UTF-8" indent="yes"/>

<xsl:template match="/">
<html lang="ka">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, follow"/>
  <title>Sitemap — Hotel Agava</title>
  <style>
    :root {
      --gold: #B08A3C;  --gold-light: #D4AF6A;  --gold-pale: #F0E6D2;
      --cream: #FAF7F1; --cream-dark: #F1EBE0;
      --ink: #241D14;   --ink-soft: #4A4136;    --muted: #7A7060;
      --line: #E4DCCC;  --white: #fff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--cream); color: var(--ink);
      font: 15px/1.6 "Segoe UI", -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px 72px; }

    header {
      background: linear-gradient(135deg, var(--ink), #3A3021);
      color: var(--gold-pale); padding: 40px 0 34px; margin-bottom: 30px;
    }
    header .wrap { padding-bottom: 0; }
    .brand {
      font-size: 13px; letter-spacing: .22em; text-transform: uppercase;
      color: var(--gold-light); margin: 0 0 10px;
    }
    h1 { margin: 0 0 8px; font-size: 30px; font-weight: 600; letter-spacing: -.01em; }
    .sub { margin: 0; color: #C9BFA9; font-size: 14px; max-width: 62ch; }
    .sub a { color: var(--gold-light); }

    .stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0 22px; }
    .stat {
      flex: 1 1 150px; background: var(--white); border: 1px solid var(--line);
      border-radius: 6px; padding: 16px 18px;
      box-shadow: 0 2px 10px rgba(36,29,20,.05);
    }
    .stat b { display: block; font-size: 26px; font-weight: 600; color: var(--gold); line-height: 1.1; }
    .stat span { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }

    .tablewrap {
      background: var(--white); border: 1px solid var(--line); border-radius: 6px;
      overflow-x: auto; box-shadow: 0 2px 10px rgba(36,29,20,.05);
    }
    table { border-collapse: collapse; width: 100%; min-width: 780px; }
    th {
      position: sticky; top: 0; z-index: 1;
      background: var(--cream-dark); color: var(--ink-soft);
      text-align: left; font-size: 11px; font-weight: 700;
      letter-spacing: .1em; text-transform: uppercase;
      padding: 13px 16px; border-bottom: 2px solid var(--line); white-space: nowrap;
    }
    td { padding: 12px 16px; border-bottom: 1px solid #F2ECE0; vertical-align: middle; }
    tr:last-child td { border-bottom: 0; }
    tbody tr:nth-child(even) { background: #FDFBF7; }
    tbody tr:hover { background: var(--gold-pale); }

    .n { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 13px; width: 48px; }
    td.url a { color: var(--ink); text-decoration: none; word-break: break-all; }
    td.url a:hover { color: var(--gold); text-decoration: underline; }

    .lang {
      display: inline-block; min-width: 30px; text-align: center;
      font-size: 11px; font-weight: 700; letter-spacing: .06em;
      padding: 3px 7px; border-radius: 4px;
      background: var(--gold-pale); color: #7A5E20;
    }
    .lang.ka { background: var(--ink); color: var(--gold-pale); }

    .pri {
      display: inline-block; padding: 3px 9px; border-radius: 20px;
      font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
      background: #EFEADF; color: var(--ink-soft);
    }
    .pri.hi  { background: var(--gold); color: #fff; }
    .pri.mid { background: var(--gold-pale); color: #7A5E20; }

    .dim { color: var(--muted); font-size: 13px; white-space: nowrap; }
    .tick { color: var(--gold); font-weight: 700; }
    .no { color: #C9BFA9; }

    footer { margin-top: 26px; font-size: 13px; color: var(--muted); }
    footer a { color: var(--gold); }

    @media (max-width: 640px) {
      h1 { font-size: 23px; }
      header { padding: 28px 0 24px; }
      .stat b { font-size: 21px; }
    }
  </style>
</head>
<body>

<header>
  <div class="wrap">
    <p class="brand">Hotel Agava · Tbilisi</p>
    <h1>XML Sitemap</h1>
    <p class="sub">
      ეს გვერდი საძიებო სისტემებისთვისაა — ის ჩამოთვლის საიტის ყველა
      ინდექსირებად მისამართს. სტუმრებისთვის განკუთვნილი საიტი აქ არის:
      <a href="https://hotelagava.ge/">hotelagava.ge</a>
    </p>
  </div>
</header>

<div class="wrap">

  <div class="stats">
    <div class="stat">
      <b><xsl:value-of select="count(sm:urlset/sm:url)"/></b>
      <span>მისამართი</span>
    </div>
    <div class="stat">
      <b><xsl:value-of select="count(sm:urlset/sm:url[not(starts-with(substring-after(sm:loc,'hotelagava.ge/'),'en/') or starts-with(substring-after(sm:loc,'hotelagava.ge/'),'ru/') or starts-with(substring-after(sm:loc,'hotelagava.ge/'),'tr/'))])"/></b>
      <span>ქართული</span>
    </div>
    <div class="stat">
      <b><xsl:value-of select="count(sm:urlset/sm:url/image:image)"/></b>
      <span>სურათი</span>
    </div>
    <div class="stat">
      <b>4</b>
      <span>ენა</span>
    </div>
  </div>

  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th class="n">#</th>
          <th>მისამართი</th>
          <th>ენა</th>
          <th>პრიორიტეტი</th>
          <th>განახლდა</th>
          <th>სიხშირე</th>
          <th>სურათი</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="sm:urlset/sm:url">
          <xsl:variable name="path" select="substring-after(sm:loc, 'hotelagava.ge/')"/>
          <xsl:variable name="p" select="sm:priority"/>
          <tr>
            <td class="n"><xsl:value-of select="position()"/></td>
            <td class="url">
              <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
            </td>
            <td>
              <xsl:choose>
                <xsl:when test="starts-with($path,'en/')"><span class="lang">EN</span></xsl:when>
                <xsl:when test="starts-with($path,'ru/')"><span class="lang">RU</span></xsl:when>
                <xsl:when test="starts-with($path,'tr/')"><span class="lang">TR</span></xsl:when>
                <xsl:otherwise><span class="lang ka">KA</span></xsl:otherwise>
              </xsl:choose>
            </td>
            <td>
              <span>
                <xsl:attribute name="class">
                  <xsl:choose>
                    <xsl:when test="$p &gt;= 0.9">pri hi</xsl:when>
                    <xsl:when test="$p &gt;= 0.8">pri mid</xsl:when>
                    <xsl:otherwise>pri</xsl:otherwise>
                  </xsl:choose>
                </xsl:attribute>
                <xsl:value-of select="$p"/>
              </span>
            </td>
            <td class="dim"><xsl:value-of select="sm:lastmod"/></td>
            <td class="dim"><xsl:value-of select="sm:changefreq"/></td>
            <td>
              <xsl:choose>
                <xsl:when test="image:image"><span class="tick">✓</span></xsl:when>
                <xsl:otherwise><span class="no">—</span></xsl:otherwise>
              </xsl:choose>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </div>

  <footer>
    თითოეულ მისამართს თან ახლავს <code>hreflang</code> ალტერნატივები ოთხივე
    ენისთვის — ისინი XML-ის კოდშია და ბრაუზერში არ ჩანს.
  </footer>

</div>
</body>
</html>
</xsl:template>

</xsl:stylesheet>
