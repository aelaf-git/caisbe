"""Industry news RSS parse, upsert, and newsletter template helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import NewsPost
from app.services.email_layout import (
    newsletter_starter_body_html,
    wrap_email_html,
)
from app.services.news_rss_sync import (
    SOURCE_FACILITIES_DIVE,
    parse_rss_xml,
    sync_news_rss,
)


SAMPLE_RSS = """<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Sample HVAC Story</title>
      <link>https://www.facilitiesdive.com/news/sample-hvac-story/1/</link>
      <description><![CDATA[<p>Short excerpt about HVAC.</p><img src="https://example.com/cover.jpg"/>]]></description>
      <pubDate>Fri, 16 Oct 2026 11:00:00 -0400</pubDate>
      <guid>https://www.facilitiesdive.com/news/sample-hvac-story/1/</guid>
    </item>
    <item>
      <title>Second Story</title>
      <link>https://www.facilitiesdive.com/news/second-story/2/</link>
      <description>Plain excerpt.</description>
      <pubDate>Thu, 15 Oct 2026 10:00:00 -0400</pubDate>
    </item>
  </channel>
</rss>
"""


def test_parse_rss_xml_extracts_items_and_image() -> None:
    items = parse_rss_xml(SAMPLE_RSS)
    assert len(items) == 2
    assert items[0].title == "Sample HVAC Story"
    assert items[0].link.endswith("/1/")
    assert items[0].summary and "HVAC" in items[0].summary
    assert items[0].image_url == "https://example.com/cover.jpg"


def test_sync_news_rss_dedupes(db: Session, monkeypatch) -> None:
    import app.services.news_rss_sync as mod

    class FakeResponse:
        text = SAMPLE_RSS

        def raise_for_status(self) -> None:
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def get(self, url: str, timeout: float = 30.0):
            return FakeResponse()

        def close(self) -> None:
            return None

    monkeypatch.setattr(mod.httpx, "Client", FakeClient)
    monkeypatch.setattr(mod.settings, "news_rss_facilities_dive_url", "https://example.com/dive")
    monkeypatch.setattr(mod.settings, "news_rss_facilitiesnet_url", "")
    monkeypatch.setattr(mod.settings, "news_rss_max_per_feed", 20)

    first = sync_news_rss(db)
    assert first.created == 2
    assert first.skipped == 0

    second = sync_news_rss(db)
    assert second.created == 0
    assert second.updated == 2
    assert second.skipped == 0

    count = (
        db.query(NewsPost)
        .filter(NewsPost.source_label == SOURCE_FACILITIES_DIVE)
        .count()
    )
    assert count == 2


def test_newsletter_starter_wraps_with_logo() -> None:
    body = newsletter_starter_body_html()
    assert "Hello" in body
    html = wrap_email_html(
        body,
        heading="CAISBE Newsletter",
        eyebrow="CAISBE Newsletter",
        include_signoff=False,
    )
    assert "logo.png" in html
    assert "CAISBE Newsletter" in html
    assert "#c42032" in html
