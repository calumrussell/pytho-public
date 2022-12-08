---
layout: default
---
<div id="posts-wrapper">
  {% for post in site.posts %}
  <div class="post-wrapper">
    <h2 class="post-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
    {%- assign date_format = site.minima.date_format | default: "%b %-d, %Y" -%}
    <time class="dt-published" datetime="{{ page.date | date_to_xmlschema }}" itemprop="datePublished">
      {{ post.date | date: date_format }}
    </time>
    <p class="post-excerpt">{{post.excerpt}}</p>
  </div>
  {% endfor %}
</div>
