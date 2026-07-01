import { Request, Response } from 'express';
import { uploadService } from '../../services/upload.service';
import { successResponse, errorResponse } from '../../utils/response';
import * as fs from 'fs';

export const uploadController = {
  async uploadImage(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('No image provided', 400));
      }

      const url = await uploadService.uploadImage(req.file);

      // Delete the temporary file immediately after processing to prevent memory leaks in the serverless container
      if ((req.file as any).path) {
        try {
          fs.unlinkSync((req.file as any).path);
        } catch (unlinkErr) {
          console.warn('Failed to delete temporary upload file:', unlinkErr);
        }
      }

      return res.json(successResponse({ url }));
    } catch (err: any) {
      // Clean up the temporary file on error as well to prevent memory leaks
      if (req.file && (req.file as any).path) {
        try {
          fs.unlinkSync((req.file as any).path);
        } catch (unlinkErr) {
          // ignore
        }
      }
      console.error('Upload error:', err);
      return res.status(500).json(errorResponse(err.message));
    }
  }
};
