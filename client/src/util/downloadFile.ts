interface FileDownload {
  fileName: string;
  content: string;
  mimeType: string;
}

function downloadFile({ fileName, content, mimeType }: FileDownload): void {
  const blob = new Blob([content], { type: mimeType });
  let url = '';
  try {
    url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export default downloadFile;
