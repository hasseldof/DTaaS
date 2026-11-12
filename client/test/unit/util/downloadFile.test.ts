import downloadFile from 'util/downloadFile';

const file = {
  fileName: 'measurement-2026-10-18T17-41-04.json',
  content: '{\n  "tasks": []\n}',
  mimeType: 'application/json',
};

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('downloadFile', () => {
  let createObjectURL: jest.Mock<string, [Blob]>;
  let click: jest.SpyInstance<void, [], HTMLAnchorElement>;

  beforeEach(() => {
    createObjectURL = jest.fn((_blob: Blob) => 'blob:mock-url');
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = jest.fn();
    click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    click.mockRestore();
    document.body.innerHTML = '';
  });

  it('saves the content under the file name with its MIME type', async () => {
    downloadFile(file);

    const [blob] = createObjectURL.mock.calls[0];
    const [link] = click.mock.contexts;
    expect(blob.type).toBe(file.mimeType);
    expect(await readText(blob)).toBe(file.content);
    expect(link.download).toBe(file.fileName);
    expect(link.href).toBe('blob:mock-url');
  });

  it('removes the link and revokes the object URL after the click', () => {
    downloadFile(file);

    expect(document.querySelector('a')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes the object URL when the click fails', () => {
    click.mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => downloadFile(file)).toThrow('blocked');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes nothing when no object URL was created', () => {
    createObjectURL.mockImplementation(() => {
      throw new Error('unsupported');
    });

    expect(() => downloadFile(file)).toThrow('unsupported');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
