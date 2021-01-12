---
layout: layouts/main.njk
title: Guides
description: Snowpack's usage and integration guides.
---

<style>
  .news-items {
    display: grid;
    grid-column-gap: 15px;
    grid-row-gap: 15px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-flow: dense;
  }
  .news-item {
    display: flex;
    grid-column: span 1;
    overflow: hidden;
    font-family: Open Sans,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;
    color: #1a202c;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
    border: 1px solid #e2e8f0;
  }
  .news-item:hover {
      border-color: #2a85ca;
    box-shadow: 0 2px 2px 0 rgba(46,94,130,0.4);
}
.news-item:hover .news-item-image {
  opacity: 0.9;
}

.news-item-image {
  width: 100%;
  flex-grow: 1;
  height: 120px;
  object-fit: cover;
  opacity: 0.8;
}
.news-item-text {
  padding: 1rem;
}
.news-item-title {
      margin: 0 0 0.25rem 0;
      font-weight: 600;
      font-size: 20px;
      font-family: "Overpass";
      line-height: 1.1;
}

.news-item:nth-child(5n+0) .news-item-image {
  background: #f2709c;
    background: linear-gradient(30deg, #ff9472, #f2709c);
}
.news-item:nth-child(5n+1) .news-item-image {
  background: #FBD3E9;
  background: linear-gradient(30deg, #BB377D, #FBD3E9);
}
.news-item:nth-child(5n+2) .news-item-image {
  background: #B993D6;
  background: linear-gradient(30deg, #8CA6DB, #B993D6);
}
.news-item:nth-child(5n+3) .news-item-image {
background: #6190E8;
background: linear-gradient(30deg, #A7BFE8, #6190E8);
}
.news-item:nth-child(5n+4) .news-item-image {
    background: #43C6AC;
    background: linear-gradient(30deg, #F8FFAE, #43C6AC);
}


</style>

<h2 class="content-title">
  {{ title }}
</h2>

<h3 class="content-title">
  Using Snowpack
</h3>

<div class="content">

- [Routing](/guides/routing)
- [Server-Side Rendering](/guides/server-side-render)
- [SSL, HTTPS, and HTTP/2 in Development](/guides/https-ssl-certificates)
- [Connecting Third-Party Tools](/guides/connecting-tools)
- [Optimize & Bundle for Production](/guides/optimize-and-bundle)
- [Streaming NPM Imports](/guides/streaming-npm-imports)
- [Testing](/guides/testing)
- [Creating Your Own Plugin](/guides/plugins)
- [Snowpack Upgrade Guide (from v1, v2)](/guides/upgrade-guide)

</div>

<br/>
<br/>

<h3 class="content-title">
  Popular Integration Guides
</h3>

<div class="news-items">
{% for post in collections.communityGuide %}

<article class="news-item">
  <a href="{{ post.url }}" style="text-decoration: none; color: initial; flex-grow: 1;">
{% if post.data.img %}<img class="news-item-image" src="{{ post.data.img }}" alt="" {% if post.data.imgBackground %} style="background: {{post.data.imgBackground}}" {% endif %} />
{% else %}<div class="news-item-image"></div>
{% endif %}
  <div class="news-item-text">
    <h3 class="news-item-title">{{ post.data.title }}</h3>
  </div>
  </a>
</article>
{% endfor %}
</div>
