---
layout: layouts/main.njk
title: Guías
description: Guías de uso e integración de Snowpack.
---

<h2 class="content-title">
  {{ title }}
</h2>

<h3 class="content-title">
  Usando Snowpack
</h3>

<div class="content">

- [Routing](/guides/routing)
- [Representación del lado del servidor](/guides/server-side-render)
- [SSL, HTTPS y HTTP / 2 en desarrollo](/guides/https-ssl-certificates)
- [Conexión de herramientas de terceros](/guides/connecting-tools)
- [Optimizar y agrupar para producción](/guides/optimize-and-bundle)
- [Importaciones en streaming](/guides/streaming-imports)
- [Pruebas](/guides/testing)
- [Creación de su propio complemento](/guides/plugins)
- [Guía de actualización de Snowpack (desde v1, v2)](/guides/upgrade-guide)

</div>

<br/>
<br/>

<h3 class="content-title">
  Guías de integración populares
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
