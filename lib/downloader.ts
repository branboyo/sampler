export async function downloadAudio(
  blob: Blob,
  filename: string,
  folderName: string,
): Promise<number> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const downloadId = await browser.downloads.download({
    url: dataUrl,
    filename: `${folderName}/${filename}`,
    saveAs: false,
  });

  return downloadId;
}
