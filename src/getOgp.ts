import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import ogs from 'npm:open-graph-scraper';

export default async (url: string) => {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Twitterbot' },
  });

  // OGP取得のリクエストに失敗した場合は空オブジェクトを返す
  if (!response.ok) {
    console.log('failed to get ogp');
    return {};
  }

  const arrayBuffer = await response.arrayBuffer();
  let html = new TextDecoder().decode(arrayBuffer);
  let doc = new DOMParser().parseFromString(html, 'text/html');

  // 文字コードがutf-8以外の場合はデコードし直す
  const [_, charset] = (
    doc?.documentElement
      ?.querySelector('meta[http-equiv="content-type"]')
      ?.attributes.getNamedItem('content')?.value || ''
  )
    .toLowerCase()
    .match(/charset=(.*)/) || [, 'utf-8'];
  if (charset !== 'utf-8') {
    html = new TextDecoder(charset).decode(arrayBuffer);
    doc = new DOMParser().parseFromString(html, 'text/html');
  }

  const { result } = await ogs({ html });
  console.log(JSON.stringify(result, null, 2));
  console.log('success to get ogp');
  return result;
};
