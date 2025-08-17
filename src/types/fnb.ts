export interface MenuCategory {
  id: string;
  propertyId: string;
  name: string;
  slug?: string;
  sortOrder: number;
  isActive: boolean;
  photoPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  propertyId: string;
  categoryId: string;
  name: string;
  nameI18n?: Record<string, string>;
  description?: string;
  descriptionI18n?: Record<string, string>;
  price: number;
  currency: string; // e.g., 'INR'
  cost?: number;
  isAvailable: boolean;
  isVeg: boolean;
  allergens?: string[];
  ingredients?: string[];
  seasonalFlags?: string[];
  tags?: string[];
  photoPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMenuItemInput extends Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> {}
