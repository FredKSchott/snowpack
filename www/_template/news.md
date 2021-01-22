---
layout: layouts/main.njk
title: Community & News
description: Snowpack community news and companies that use Snowpack.

# Using Snowpack? Want to be featured on snowpack.dev?
# Add your project, organization, or company to the end of this list!
usersList:
  - ia:
    name: The Internet Archive
    img: https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Internet_Archive_logo_and_wordmark.svg/1200px-Internet_Archive_logo_and_wordmark.svg.png
    url: https://github.com/internetarchive/dweb-archive
  - 1688:
    name: Alibaba 1688
    img: https://s.cafebazaar.ir/1/icons/com.alibaba.intl.android.apps.poseidon_512x512.png
    url: https://www.1688.com
  - intel:
    name: Intel
    img: https://upload.wikimedia.org/wikipedia/commons/4/4e/Intel_logo_%282006%29.svg
    url: https://twitter.com/kennethrohde/status/1227273971831332865
  - circlehd.com:
    name: CircleHD
    img: https://www.circlehd.com/img/logo-sm.svg
    url: https://www.circlehd.com/
  - Svelvet:
    name: Svelvet
    img: https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/237/spool-of-thread_1f9f5.png
    url: https://github.com/jakedeichert/svelvet
  - pika:
    name: Pika.dev
    img: https://www.pika.dev/static/img/logo5.svg
    url: https://www.pika.dev
  - Toast:
    name: Toast
    img: https://www.toast.dev/toast-icon-300.png
    url: https://www.toast.dev
  - maskable:
    name: Maskable.app
    img: https://maskable.app/favicon/favicon_196.png
    url: https://maskable.app/
  - web-skills:
    name: Web Skills
    img: https://andreasbm.github.io/web-skills/www/icon.svg
    url: https://andreasbm.github.io/web-skills
  - swissdev-javascript:
    name: SwissDev JavaScript Jobs
    img: https://static.swissdevjobs.ch/pictures/swissdev-javascript-jobs.svg
    url: https://swissdevjobs.ch/jobs/JavaScript/All
  - tradie-training:
    name: Tradie Training
    img: https://tt.edu.au/images/logo.png
    url: https://tt.edu.au
  - wemake-services:
    name: wemake.services
    img: https://avatars0.githubusercontent.com/u/19639014?s=200&v=4
    url: https://github.com/wemake-services
  - airhacks.com:
    name: airhacks.com
    img: https://airhacks.com/logo.svg
    url: https://airhacks.com
  - tongdun:
    name: tongdun
    img: https://www.tongdun.cn/static/favicon.ico
    url: https://www.tongdun.cn/
  - blessing-skin:
    name: Blessing Skin
    img: https://blessing.netlify.app/logo.png
    url: https://github.com/bs-community
  - trpg-engine:
    name: TRPG Engine
    img: https://trpgdoc.moonrailgun.com/img/trpg_logo.png
    url: https://trpgdoc.moonrailgun.com/
  - shein:
    name: SHEIN
    img: https://sheinsz.ltwebstatic.com/she_dist/images/touch-icon-ipad-144-47ceee2d97.png
    url: https://www.shein.com/
  - seekinnovation:
    name: SeekInnovation
    img: https://assets.website-files.com/5e2c3e23d2e067287ea582e4/5e6a5bca2d401204ada76b95_SeekInnovationLogoRound_Vector.svg
    url: https://seekinnovation.at
---
<h2 class="content-title">
  {{ title }}
</h2>

Get the latest news, blog posts, and tutorials on Snowpack. [Also available via RSS.](/feed.xml)

Got something that you think we should feature? [Submit it!](https://github.com/snowpackjs/snowpack/edit/main/www/_data/news.js)

<div class="news-items">
  <article class="discord-banner">
    <a href="https://discord.gg/snowpack" style="flex-shrink: 0; height: 48px;"><img alt="Join us on Discord!" src="https://img.shields.io/discord/712696926406967308.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2" style="height: 48px;  border: none; margin-right: 1rem; filter: brightness(1.2) contrast(1.5);"/></a>
    <div>Join us on Discord to discuss Snowpack, meet other developers in our community, and show off what you’re working on!</div>
  </article>

{% for item in news %}

<article class="news-item">
  <a href="{{ item.url }}" style="text-decoration: none; color: initial;">
{% if item.img %}<img class="news-item-image" src="{{ item.img }}" alt="" />
{% else %}<div class="news-item-image"></div>
{% endif %}
  <div class="news-item-text">
    <h3 class="news-item-title">{{ item.title }}</h3>
    <time class="snow-toc-link">{{ item.date | date: "%B %e, %Y" }}</time>
    <p style="margin: 0.5rem 0 0.25rem;">{{ item.description }}</p>
  </div>
  </a>
</article>
{% endfor %}
</div>

<div class="content">

### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank" rel="noopener noreferrer nofollow">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/snowpackjs/snowpack/edit/main/www/_template/news.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

### Assets

- [Snowpack Logo (PNG, White)](/img/snowpack-logo-white.png)
- [Snowpack Logo (PNG, Dark)](/img/snowpack-logo-dark.png)
- [Snowpack Logo (PNG, Black)](/img/snowpack-logo-black.png)
- [Snowpack Wordmark (PNG, White)](/img/snowpack-wordmark-white.png)
- [Snowpack Wordmark (PNG, Black)](/img/snowpack-wordmark-black.png)

</div>
