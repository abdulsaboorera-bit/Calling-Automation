export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  name: string;

  upload(key: string, data: Buffer | ReadableStream, contentType: string): Promise<UploadResult>;

  download(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  list(prefix: string): Promise<string[]>;
}

export type StorageProviderFactory = () => StorageProvider;
