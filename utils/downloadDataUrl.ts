/**
 * Utility for downloading a data URL as a file
 */

/**
 * Downloads a data URL as a file
 * 
 * @param dataUrl - The base64 data URL to download
 * @param filename - The name for the downloaded file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
