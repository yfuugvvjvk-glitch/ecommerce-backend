"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.uploadProductImage = uploadProductImage;
exports.uploadOfferImage = uploadOfferImage;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const promises_1 = require("stream/promises");
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
async function uploadAvatar(request, reply) {
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
    const filename = `avatar-${request.user.userId}-${timestamp}${ext}`;
    const filepath = path.join(AVATAR_UPLOAD_DIR, filename);
    // Save file
    await (0, promises_1.pipeline)(data.file, fs.createWriteStream(filepath));
    return {
        filename,
        filepath,
        url: `/uploads/avatars/${filename}`,
        mimetype: data.mimetype,
        size: fileSize,
    };
}
async function uploadProductImage(request, reply) {
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
    await (0, promises_1.pipeline)(data.file, fs.createWriteStream(filepath));
    return {
        filename,
        filepath,
        url: `/uploads/products/${filename}`,
        mimetype: data.mimetype,
        size: fileSize,
    };
}
async function uploadOfferImage(request, reply) {
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
    await (0, promises_1.pipeline)(data.file, fs.createWriteStream(filepath));
    return {
        filename,
        filepath,
        url: `/uploads/offers/${filename}`,
        mimetype: data.mimetype,
        size: fileSize,
    };
}
