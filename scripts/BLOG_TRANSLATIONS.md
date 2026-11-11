# Reviewed blog translations

The admin remains the source of published Georgian posts. `build_blog.py`
reads those posts and builds their reviewed EN/RU/TR editions from
`data/blog-translations.json` and `data/blog-translations/*.md`.

To add or revise a translation:

1. Fetch the current published source with `build_blog.fetch_posts()`.
2. Review the translated title, description and Markdown against that source.
3. Store `build_blog.source_digest(post)` in the manifest and update the
   translation publication date as appropriate.
4. Run the blog build, SEO sync, sitemap generation and validation.

The digest covers the source title, excerpt and body. A change to any of
those fields hides the old translations until editorial review. Cover image
changes propagate without requiring a text review. Unpublishing or deleting
the Georgian post also removes its generated translations. The builder
updates language links and removes cross-links to unavailable translations.
It never modifies Supabase data. New posts are not translated automatically.

Localized lists are static and update with the existing site publishing
workflow, rather than replacing themselves with a Georgian database response
in the browser. Metadata overrides from the admin are still applied by
`syncseo.py` after the blog build.
