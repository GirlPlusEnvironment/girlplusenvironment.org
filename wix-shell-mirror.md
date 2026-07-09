# GPE Wix Shell Mirror

This mirror applies the post-"Why your footer is rendering too long" guidance:

- Keep the Wix page shell responsible for the custom header/footer.
- Keep embedded HTML focused on body content only.
- Use `target="_top"` for links inside embeds that should break out of the iframe.
- Do not rely on Wix Custom Code CSS to style inside an HTML embed iframe.

## Embedded Page Rule

- `camp-gpe.html` no longer renders its own header or footer.
- `extreme-weather.html` no longer renders its own header or footer.
- If another mirrored embed adds shell navigation later, do not include a second embedded header/footer when Wix Custom Code is handling the shell.

## Wix Custom Code: Body-start Header

```html
<style>
  .gpe-custom-header {
    position: sticky;
    top: 0;
    z-index: 999999;
    width: 100%;
    background: #d53f8c;
    border-bottom: 4px solid #000;
    box-sizing: border-box;
    padding: 14px 28px;
    font-family: 'Space Mono', monospace;
  }
  .gpe-custom-header-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .gpe-custom-header img {
    height: 38px;
    width: auto;
    display: block;
  }
  .gpe-custom-nav {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .gpe-custom-nav a {
    color: #000;
    background: #fff;
    border: 3px solid #000;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 4px 4px 0 #000;
  }
  .gpe-custom-nav a.gpe-donate {
    background: #000;
    color: #fff;
    box-shadow: none;
  }
  @media (max-width: 767px) {
    .gpe-custom-header-inner {
      flex-direction: column;
      align-items: center;
    }
    .gpe-custom-nav {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    if (document.querySelector(".gpe-custom-header")) return;
    const header = document.createElement("header");
    header.className = "gpe-custom-header";
    header.innerHTML = `
      <div class="gpe-custom-header-inner">
        <a href="https://www.girlplusenvironment.org">
          <img src="https://static.wixstatic.com/media/265a01_e2bdfec40bcb424189b3dad95d6e7fe9~mv2.png/v1/crop/x_0,y_233,w_688,h_76/fill/w_956,h_106,fp_0.50_0.50,lg_1,q_85,enc_avif,quality_auto/GPE%20Full%20TM%20Logo%20White.png" alt="Girl Plus Environment">
        </a>
        <nav class="gpe-custom-nav" aria-label="Main navigation">
          <a href="https://www.girlplusenvironment.org">HOME</a>
          <a href="https://www.girlplusenvironment.org/resources">RESOURCES</a>
          <a href="https://www.girlplusenvironment.org/become-a-member">JOIN US</a>
          <a class="gpe-donate" href="https://www.girlplusenvironment.org/donate">DONATE</a>
        </nav>
      </div>
    `;
    document.body.prepend(header);
  });
</script>
```

## Wix Custom Code: Body-end Footer

```html
<style>
  .gpe-custom-footer {
    background: #fbd3d3;
    color: #000;
    border-top: 4px solid #000;
    padding: 24px 32px 18px;
    font-family: 'Space Mono', monospace;
    box-sizing: border-box;
  }
  .gpe-custom-footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .gpe-custom-footer img {
    height: 38px;
    width: auto;
    display: block;
  }
  .gpe-custom-footer-right {
    text-align: right;
  }
  .gpe-custom-footer-right p {
    margin: 0 0 8px;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 700;
  }
  .gpe-custom-socials {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
  }
  .gpe-custom-socials a {
    color: #000;
    text-decoration: none;
    font-weight: 700;
  }
  .gpe-custom-footer-bottom {
    max-width: 1280px;
    margin: 14px auto 0;
    padding-top: 10px;
    border-top: 2px solid rgba(0,0,0,.2);
    text-align: center;
    font-size: 14px;
    opacity: .75;
  }
  @media (max-width: 767px) {
    .gpe-custom-footer-inner {
      flex-direction: column;
      text-align: center;
    }
    .gpe-custom-footer-right {
      text-align: center;
    }
    .gpe-custom-socials {
      justify-content: center;
      flex-wrap: wrap;
    }
  }
</style>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    if (document.querySelector(".gpe-custom-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "gpe-custom-footer";
    footer.innerHTML = `
      <div class="gpe-custom-footer-inner">
        <a href="https://www.girlplusenvironment.org">
          <img src="https://static.wixstatic.com/media/265a01_e2bdfec40bcb424189b3dad95d6e7fe9~mv2.png/v1/crop/x_0,y_233,w_688,h_76/fill/w_956,h_106,fp_0.50_0.50,lg_1,q_85,enc_avif,quality_auto/GPE%20Full%20TM%20Logo%20White.png" alt="Girl Plus Environment">
        </a>
        <div class="gpe-custom-footer-right">
          <p>Hot Girl Summer, but Make It Climate Advocacy.</p>
          <div class="gpe-custom-socials">
            <a href="https://www.linkedin.com/company/girlplusenvironment/">LinkedIn</a>
            <a href="https://www.instagram.com/girlplusenvironment/">Instagram</a>
            <a href="https://www.tiktok.com/@girlplusenvironment">TikTok</a>
            <a href="https://www.youtube.com/@GirlEnvironmentOrganization">YouTube</a>
          </div>
        </div>
      </div>
      <div class="gpe-custom-footer-bottom">
        © 2026 GIRL PLUS ENVIRONMENT. ALL RIGHTS RESERVED.
      </div>
    `;
    document.body.appendChild(footer);
  });
</script>
```

## Embedded Link Pattern

Use this for links inside embedded HTML that should navigate the full Wix tab:

```html
<a href="https://www.girlplusenvironment.org/take-action" target="_top" rel="noopener">Take Action</a>
```

Do not rely on a blanket script like:

```js
window.top.location.href = this.href;
```

Prefer explicit `target="_top"` links instead.
