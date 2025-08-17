import { supabase } from './supabase';
import { EnhancedFileValidator } from '../utils/fileValidator';

export class MenuStorageService {
  private static readonly BUCKET_NAME = 'menu-photos';
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Buckets must be created server-side; no-op here
  static async ensureBucket(): Promise<void> { return; }

  static async uploadItemPhoto(
    propertyId: string,
    categoryId: string,
    itemId: string,
    file: File
  ): Promise<{ path: string }> {
    const validation = await EnhancedFileValidator.validateFile(file, {
      allowedTypes: this.ALLOWED_TYPES,
      maxFileSize: this.MAX_FILE_SIZE,
      maxImageWidth: 4096,
      minImageWidth: 100,
      minImageHeight: 100,
    });
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const processed = await this.compressImage(file, 1600, 0.8);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${propertyId}/${categoryId}/${itemId}/${ts}-${rand}.${ext}`;

    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, processed, { cacheControl: '86400', upsert: true });
    if (error) throw error;

    return { path };
  }

  static async deleteItemPhoto(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);
    if (error) throw error;
  }

  static async uploadCategoryPhoto(
    propertyId: string,
    categoryId: string,
    file: File
  ): Promise<{ path: string }> {
    const validation = await EnhancedFileValidator.validateFile(file, {
      allowedTypes: this.ALLOWED_TYPES,
      maxFileSize: this.MAX_FILE_SIZE,
      maxImageWidth: 4096,
      minImageWidth: 200,
      minImageHeight: 120,
    });
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    const processed = await this.compressImage(file, 1920, 0.82);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${propertyId}/${categoryId}/_category/${ts}-${rand}.${ext}`;

    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, processed, { cacheControl: '86400', upsert: true });
    if (error) throw error;
    return { path };
  }

  static async deleteCategoryPhoto(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);
    if (error) throw error;
  }

  static async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) throw error || new Error('Failed to sign URL');
    return data.signedUrl;
  }

  private static async compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
    if (!file.type.startsWith('image/')) return file;
    const img = await this.loadImage(URL.createObjectURL(file));
    const scale = Math.min(1, maxWidth / (img.width || maxWidth));
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const type = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    return await new Promise<Blob>((resolve) => canvas.toBlob(blob => resolve(blob || file), type, quality));
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
}
