export type FileMetadata = {
  file: {
    name: string;
    path: string;
    size: number;
    type: string;
    lastModified?: number;
  };
  common?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    description?: string;
    software?: string;
    created?: string;
    modified?: string;
  };
  tags?: Record<string, string>;
  image?: { width: number; height: number };
  video?: { width?: number; height?: number; duration?: number };
  audio?: { duration?: number };
  exif?: {
    make?: string;
    model?: string;
    datetimeOriginal?: string;
    orientation?: number;
    gps?: { lat: number; lon: number };
  };
  forensic?: { sha256?: string };
  warnings?: string[];
  errors?: string[];
};
