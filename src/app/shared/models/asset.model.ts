export interface Asset {
  id?: string | number;
  name: string;
  html: string;
  css: string;
  js?: string;
  meta?: Record<string, any>;
  version?: string;
  createdAt?: string;

  // Frontend UI component aliases for backwards compatibility
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  image?: string;
  image_url?: string;
  status?: string;
  html_content?: string;
  css_content?: string;
}
