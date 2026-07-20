import { Router, Request, Response, NextFunction } from 'express';
import { uploadController } from './upload.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import busboy from 'busboy';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

const busboyUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Multipart form data required' });
  }

  try {
    const bb = busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      }
    });
    let fileUploaded = false;
    let uploadError: Error | null = null;

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        file.resume();
        uploadError = new Error('Only images and PDF documents are allowed');
        return;
      }

      const tempFilePath = path.join(os.tmpdir(), filename);
      const writeStream = fs.createWriteStream(tempFilePath);
      file.pipe(writeStream);

      req.file = {
        fieldname: name,
        originalname: filename,
        encoding: info.encoding,
        mimetype: mimeType,
        destination: os.tmpdir(),
        filename: filename,
        path: tempFilePath,
        size: 0,
      } as any;

      fileUploaded = true;
    });

    bb.on('finish', () => {
      if (uploadError) {
        return next(uploadError);
      }
      if (!fileUploaded) {
        return res.status(400).json({ error: 'No file provided' });
      }
      next();
    });

    bb.on('error', (err) => {
      next(err);
    });

    req.pipe(bb);
  } catch (err) {
    next(err);
  }
};

router.post('/', authenticate, busboyUpload, uploadController.uploadImage);

export default router;
