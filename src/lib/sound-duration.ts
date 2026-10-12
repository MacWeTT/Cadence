/** How long a sound file plays, in milliseconds, worked out by decoding it (a file's own length tag can be wrong). */
export const measureSound = async (file: File): Promise<number> => {
  const audio = new OfflineAudioContext(1, 1, 44_100);
  const buffer = await audio.decodeAudioData(await file.arrayBuffer());

  return Math.round(buffer.duration * 1000);
};
