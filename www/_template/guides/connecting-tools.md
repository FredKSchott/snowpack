---
layout: layouts/guide.njk
title: The Snowpack Guide to connecting your favorite tools
description: 'How do you use your favorite tools in Snowpack? This Guide will help you get started'
tags: guides
sidebarTitle: Connecting your favorite tools
---

One of the biggest questions we get in our discussion forums and Discord is how to connect tools to Snowpack. EsLint, PostCSS, SASS, and any other of the useful tools developers use to build JavaScript these days. In this Guide we'll go over how to use your favorite tools with Snowpack. Almost all work with just a few additions to a configuration file.

## The three ways

It's worth first going over the three ways and their pros and cons:

- Snowpack plugins
- Run scripts using Snowpack
- Run scripts outside of Snowpack (in `package.json`)

## Plugin

Snowpack has a growing plugin ecosystem. Adding a plugin is almost always just two steps: install the Plugin using your package manager and then tell Snowpack about it by adding the name of the plugin to the Snowpack config file.

If there isn't a plugin yet, you might be interested in making one. Check out our Guide to creating a plugin

## Connect any other Script/CLI using plugin-run-script and plugin-build-script
