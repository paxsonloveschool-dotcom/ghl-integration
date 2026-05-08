export interface PexelsVideo {
  url: string;
  width: number;
  height: number;
}

export async function fetchHeroVideo(query: string): Promise<PexelsVideo | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=5`,
      { headers: { Authorization: apiKey } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const videos = data.videos as Array<{
      video_files: Array<{ link: string; width: number; height: number; quality: string }>;
    }>;

    if (!videos?.length) return null;

    // Pick first video with HD file
    for (const video of videos) {
      const hd = video.video_files.find(
        (f) => f.quality === "hd" && f.width >= 1280
      ) || video.video_files[0];
      if (hd) return { url: hd.link, width: hd.width, height: hd.height };
    }

    return null;
  } catch {
    return null;
  }
}
