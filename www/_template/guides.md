---
layout: layouts/main.njk
title: Guides
description: Snowpack's usage and integration guides.
---

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
- [Streaming Imports](/guides/streaming-imports)
- [Testing](/guides/testing)
- [Creating Your Own Plugin](/guides/plugins)
- [Snowpack Upgrade Guide (from v1, v2)](/guides/upgrade-guide)

</div>

<br/>
<br/>

<h3 class="content-title">
  Popular Integration Guides
</h3>

<div class="card-grid card-grid-4">
{% for post in collections.communityGuide %}

<article class="card">
  <a href="{{ post.url }}" style="text-decoration: none; color: initial; flex-grow: 1;">
{% if post.data.img %}<img class="card-image card-image-small" src="{{ post.data.img }}" alt="" {% if post.data.imgBackground %} style="background: {{post.data.imgBackground}}" {% endif %} />
{% else %}<div class="card-image card-image-small"></div>
{% endif %}
  <div class="card-text">
    <h3 class="card-title">{{ post.data.title }}</h3>
  </div>
  </a>
</article>
{% endfor %}
</div>
