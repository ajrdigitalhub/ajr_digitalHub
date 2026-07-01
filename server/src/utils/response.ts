export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
  error?: string;
  timestamp: string;
}

export const successResponse = <T>(data: T, meta?: any): ApiResponse<T> => ({
  success: true,
  data,
  meta,
  timestamp: new Date().toISOString()
});

export const errorResponse = (message: string, status = 500): ApiResponse<null> => ({
  success: false,
  data: null,
  error: message,
  timestamp: new Date().toISOString()
});
