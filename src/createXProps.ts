import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import defaultsGraphemer from 'npm:graphemer';
const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

export default async (item: FeedEntry) => {
  const title: string = (item.title?.value || '').trim();
  const link: string = item.links[0].href || '';

  // X用のテキストを作成
  const xText = (() => {
    const max = 110;
    const text = `${link}\n${title}`;
    if (splitter.countGraphemes(title) <= max) return text;

    const ellipsis = '...';
    const cnt = max - splitter.countGraphemes(ellipsis);
    const shortenedTitle = splitter
      .splitGraphemes(title)
      .slice(0, cnt)
      .join('');
    return `${link}\n${shortenedTitle}${ellipsis}`;
  })();

  console.log('success createXProps');
  return { xText };
};
