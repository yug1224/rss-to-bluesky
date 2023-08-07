import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import defaultsGraphemer from 'npm:graphemer';
const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

export default (item: FeedEntry) => {
  const title: string = item.title?.value || '';
  const description: string = item.description?.value || '';
  const link: string = item.links[0].href || '';
  const text = `${title}\n${link}`;

  // Bluesky用のテキストを作成
  const bskyText = (() => {
    const max = 300;
    if (splitter.countGraphemes(text) <= max) return text;
    const ellipsis = '...\n';
    const cnt = max - ellipsis.length - splitter.countGraphemes(link);
    const shortenedTitle = splitter
      .splitGraphemes(title)
      .slice(0, cnt)
      .join('');
    return `${shortenedTitle}${ellipsis}${link}`;
  })();

  // X用のテキストを作成
  const xText = (() => {
    const max = 118;
    if (splitter.countGraphemes(title) <= max) return text;
    const ellipsis = '...\n';
    const cnt = max - ellipsis.length;
    const shortenedTitle = splitter
      .splitGraphemes(title)
      .slice(0, cnt)
      .join('');
    return `${shortenedTitle}${ellipsis}${link}`;
  })();

  return { bskyText, xText, title, link, description };
};
