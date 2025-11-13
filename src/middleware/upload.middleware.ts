import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
const OFFER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'offers');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg', 'image/webp'];

// Ensure upload directories exist
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(PRODUCT_UPLOAD_DIR)) {
  fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(OFFER_UPLOAD_DIR)) {
  fs.mkdirSync(OFFER_UPLOAD_DIR, { recursive: true });
}

export interface UploadedFile {
  filename: string;
  filepath: string;
  url: string;
  mimetype: string;
  size: number;
}

export async function uploadAvatar(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<UploadedFile> {
  const data = await request.file();

  if (!data) {
    reply.code(400).send({ error: 'No file uploaded' });
    throw new Error('No file uploaded');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(data.mimetype)) {
    reply.code(400).send({
      error: 'Invalid file type. Only JPG, PNG, and GIF are allowed',
    });
    throw new Error('Invalid file type');
  }

  // Validate file size
  const fileSize = data.file.bytesRead || 0;
  if (fileSize > MAX_FILE_SIZE) {
    reply.code(400).send({
      error: 'File too large. Maximum size is 5MB',
    });
    throw new Error('File too large');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = path.extname(data.filename);
  const filename = `avatar-${request.user!.userId}-${timestamp}${ext}`;
  const filepath = path.join(AVATAR_UPLOAD_DIR, filename);

  // Save file
  await pipeline(data.file, fs.createWriteStream(filepath));

  return {
    filename,
    filepath,
    url: `/uploads/avatars/${filename}`,
    mimetype: data.mimetype,
    size: fileSize,
  };
}

export async function uploadProductImage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<UploadedFile> {
  const data = await request.file();

  if (!data) {
    reply.code(400).send({ error: 'No file uploaded' });
    throw new Error('No file uploaded');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(data.mimetype)) {
    reply.code(400).send({
      error: 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed',
    });
    throw new Error('Invalid file type');
  }

  // Validate file size
  const fileSize = data.file.bytesRead || 0;
  if (fileSize > MAX_FILE_SIZE) {
    reply.code(400).send({
      error: 'File too large. Maximum size is 5MB',
    });
    throw new Error('File too large');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = path.extname(data.filename);
  const filename = `product-${timestamp}${ext}`;
  const filepath = path.join(PRODUCT_UPLOAD_DIR, filename);

  // Save file
  await pipeline(data.file, fs.createWriteStream(filepath));

  return {
    filename,
    filepath,
    url: `/uploads/products/${filename}`,
    mimetype: data.mimetype,
    size: fileSize,
  };
}

export async function uploadOfferImage(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<UploadedFile> {
  const data = await request.file();

  if (!data) {
    reply.code(400).send({ error: 'No file uploaded' });
    throw new Error('No file uploaded');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(data.mimetype)) {
    reply.code(400).send({
      error: 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed',
    });
    throw new Error('Invalid file type');
  }

  // Validate file size
  const fileSize = data.file.bytesRead || 0;
  if (fileSize > MAX_FILE_SIZE) {
    reply.code(400).send({
      error: 'File too large. Maximum size is 5MB',
    });
    throw new Error('File too large');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = path.extname(data.filename);
  const filename = `offer-${timestamp}${ext}`;
  const filepath = path.join(OFFER_UPLOAD_DIR, filename);

  // Save file
  await pipeline(data.file, fs.createWriteStream(filepath));

  return {
    filename,
    filepath,
    url: `/uploads/offers/${filename}`,
    mimetype: data.mimetype,
    size: fileSize,
  };
}
