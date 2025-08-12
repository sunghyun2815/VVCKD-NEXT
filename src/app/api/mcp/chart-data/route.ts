import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { fetchSpotifyChartData } from '@/lib/spotify/chartFetcher';

const CHART_DATA_PATH = path.join(process.cwd(), 'public/data/spotify_chart.json');

async function loadChartData() {
  try {
    const raw = await fs.readFile(CHART_DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveChartData(data: any) {
  await fs.mkdir(path.dirname(CHART_DATA_PATH), { recursive: true });
  await fs.writeFile(CHART_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function needsUpdate(stat: Date): boolean {
  const now = new Date();
  const diff = (now.getTime() - stat.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 7;
}

export async function POST(req: NextRequest) {
  try {
    const { forceUpdate = false } = await req.json();
    let chartData;

    let updateRequired = forceUpdate;
    try {
      const fileStat = await fs.stat(CHART_DATA_PATH);
      updateRequired = updateRequired || needsUpdate(fileStat.mtime);
    } catch {
      updateRequired = true;
    }

    if (updateRequired) {
      try {
        chartData = await fetchSpotifyChartData();
        await saveChartData(chartData);
      } catch (err) {
        const fallback = await loadChartData();
        if (!fallback) throw err;
        chartData = fallback;
      }
    } else {
      chartData = await loadChartData();
      if (!chartData) throw new Error('No cached data found.');
    }

    return NextResponse.json({ success: true, data: chartData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
