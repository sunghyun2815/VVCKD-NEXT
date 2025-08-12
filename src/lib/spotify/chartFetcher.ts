// lib/spotify/chartFetcher.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY is not defined in environment variables');
}

export async function fetchSpotifyChartData() {
  const songs: any[] = [];

  const response = await axios.get('https://kworb.net/spotify/country/global_weekly.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const $ = cheerio.load(response.data);
  const rows = $('#spotifyweekly tr');

  rows.each((i, el) => {
    if (i === 0 || i > 10) return;
    const tds = $(el).find('td');
    const div = tds.eq(2).find('div').text().trim();
    const [artist, ...titleParts] = div.split(' - ');
    const title = titleParts.join(' - ');

    songs.push({
      rank: parseInt(tds.eq(0).text()) || i,
      change: tds.eq(1).text().trim() || 'N/A',
      artist: artist.trim(),
      title: title.trim(),
    });
  });

  const songList = songs.map(s => `${s.rank}. ${s.artist} - ${s.title} (${s.change})`).join('\n');

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY!, // <- ! 추가
        'anthropic-version': '2023-06-01'
        },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      system: 'Respond with pure JSON array. No markdown.',
      messages: [
        {
          role: 'user',
          content: `다음 곡들을 JSON으로 변환해줘:\n\n${songList}\n\n각 곡은 rank, title, artist, change, info[], stats{}, credits[] 포함해야 해.`
        }
      ]
    })
  });

  const result = await claudeResponse.json();
  if (!result || !Array.isArray(result.content)) {
    console.error('Claude 응답 형식 이상함:', result);
    throw new Error('Claude API 응답 형식 오류');
  }

  let jsonText = '';
  for (const item of result.content) {
    if (item.type === 'text') jsonText += item.text;
  }

  jsonText = jsonText.trim().replace(/^```json\n?|```$/g, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Claude 응답 JSON 파싱 실패:', jsonText);
    throw new Error('Claude 응답 JSON 파싱 실패');
  }

  return parsed.map((item: any, i: number) => ({
    ...item,
    ...songs[i]
  }));
}