import { supabase } from '../lib/supabase';
import type { MenuCategory, MenuItem, CreateMenuItemInput } from '../types/fnb';

export const menuService = {
  async listCategories(propertyId: string): Promise<MenuCategory[]> {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('property_id', propertyId)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      propertyId: row.property_id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order ?? 0,
      isActive: row.is_active ?? true,
      photoPath: row.photo_path || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async listCategoriesLocalized(propertyId: string, locale: string): Promise<MenuCategory[]> {
    const base = await this.listCategories(propertyId);
    // Fast path for English base locales
    if (!locale || locale.toLowerCase().startsWith('en')) return base;
    try {
      const { data: tr, error } = await supabase
        .from('menu_category_translations')
        .select('category_id, name')
        .in('category_id', base.map(c => c.id))
        .eq('locale', locale);
      if (error) throw error;
      const map = new Map((tr || []).map((r: any) => [r.category_id, r.name as string]));
      return base.map(c => map.has(c.id) ? { ...c, name: map.get(c.id)! } : c);
    } catch {
      return base;
    }
  },

  async createCategory(propertyId: string, input: { name: string; isActive?: boolean; sortOrder?: number }): Promise<MenuCategory> {
    const payload = {
      property_id: propertyId,
      name: input.name,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    };
    const { data, error } = await supabase
      .from('menu_categories')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      propertyId: data.property_id,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order ?? 0,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateCategory(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.photoPath !== undefined) payload.photo_path = updates.photoPath;

    const { data, error } = await supabase
      .from('menu_categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      propertyId: data.property_id,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order ?? 0,
      isActive: data.is_active ?? true,
      photoPath: data.photo_path || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async reorderCategories(propertyId: string, categoryIdsInOrder: string[]): Promise<void> {
    // Persist new sort_order based on array index
    await Promise.all(
      categoryIdsInOrder.map((id, idx) =>
        supabase.from('menu_categories').update({ sort_order: idx }).eq('id', id)
      )
    );
  },

  async listItems(params: { propertyId: string; categoryId?: string; search?: string; availableOnly?: boolean; locale?: string }): Promise<MenuItem[]> {
    let query = supabase
      .from('menu_items')
      .select('*')
      .eq('property_id', params.propertyId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (params.categoryId) query = query.eq('category_id', params.categoryId);
    if (params.availableOnly) query = query.eq('is_available', true);
    if (params.search) query = query.ilike('name', `%${params.search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const baseItems: MenuItem[] = (data || []).map((row: any) => ({
      id: row.id,
      propertyId: row.property_id,
      categoryId: row.category_id,
      name: row.name,
      nameI18n: row.name_i18n || {},
      description: row.description || undefined,
      descriptionI18n: row.description_i18n || {},
      price: parseFloat(row.price),
      currency: row.currency || 'INR',
      cost: row.cost != null ? parseFloat(row.cost) : undefined,
      isAvailable: !!row.is_available,
      isVeg: !!row.is_veg,
      allergens: row.allergens || [],
      ingredients: row.ingredients || [],
      seasonalFlags: row.seasonal_flags || [],
      tags: row.tags || [],
      photoPath: row.photo_path || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const locale = params.locale || '';
    if (!locale || locale.toLowerCase().startsWith('en') || baseItems.length === 0) return baseItems;

    try {
      const { data: tr, error } = await supabase
        .from('menu_item_translations')
        .select('item_id, name, description')
        .in('item_id', baseItems.map(i => i.id))
        .eq('locale', locale);
      if (error) throw error;
      const byId = new Map((tr || []).map((r: any) => [r.item_id, { name: r.name as string, description: r.description as string | null }]));
      return baseItems.map(i => byId.has(i.id) ? { ...i, name: byId.get(i.id)!.name || i.name, description: byId.get(i.id)!.description ?? i.description } : i);
    } catch {
      return baseItems;
    }
  },

  async createItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const payload: any = {
      property_id: input.propertyId,
      category_id: input.categoryId,
      name: input.name,
      name_i18n: input.nameI18n || {},
      description: input.description || null,
      description_i18n: input.descriptionI18n || {},
      price: input.price,
      currency: input.currency || 'INR',
      cost: input.cost ?? null,
      is_available: input.isAvailable ?? true,
      is_veg: input.isVeg ?? true,
      allergens: input.allergens || [],
      ingredients: input.ingredients || [],
      seasonal_flags: input.seasonalFlags || [],
      tags: input.tags || [],
      photo_path: input.photoPath || null,
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;

    return {
      id: data.id,
      propertyId: data.property_id,
      categoryId: data.category_id,
      name: data.name,
      nameI18n: data.name_i18n || {},
      description: data.description || undefined,
      descriptionI18n: data.description_i18n || {},
      price: parseFloat(data.price),
      currency: data.currency || 'INR',
      cost: data.cost != null ? parseFloat(data.cost) : undefined,
      isAvailable: !!data.is_available,
      isVeg: !!data.is_veg,
      allergens: data.allergens || [],
      ingredients: data.ingredients || [],
      seasonalFlags: data.seasonal_flags || [],
      tags: data.tags || [],
      photoPath: data.photo_path || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const payload: any = {};
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.nameI18n !== undefined) payload.name_i18n = updates.nameI18n;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.descriptionI18n !== undefined) payload.description_i18n = updates.descriptionI18n;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.cost !== undefined) payload.cost = updates.cost;
    if (updates.isAvailable !== undefined) payload.is_available = updates.isAvailable;
    if (updates.isVeg !== undefined) payload.is_veg = updates.isVeg;
    if (updates.allergens !== undefined) payload.allergens = updates.allergens;
    if (updates.ingredients !== undefined) payload.ingredients = updates.ingredients;
    if (updates.seasonalFlags !== undefined) payload.seasonal_flags = updates.seasonalFlags;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.photoPath !== undefined) payload.photo_path = updates.photoPath;
    if ((updates as any).sortOrder !== undefined) payload.sort_order = (updates as any).sortOrder;

    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    return {
      id: data.id,
      propertyId: data.property_id,
      categoryId: data.category_id,
      name: data.name,
      nameI18n: data.name_i18n || {},
      description: data.description || undefined,
      descriptionI18n: data.description_i18n || {},
      price: parseFloat(data.price),
      currency: data.currency || 'INR',
      cost: data.cost != null ? parseFloat(data.cost) : undefined,
      isAvailable: !!data.is_available,
      isVeg: !!data.is_veg,
      allergens: data.allergens || [],
      ingredients: data.ingredients || [],
      seasonalFlags: data.seasonal_flags || [],
      tags: data.tags || [],
      photoPath: data.photo_path || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async reorderItems(categoryId: string, itemIdsInOrder: string[]): Promise<void> {
    await Promise.all(
      itemIdsInOrder.map((id, idx) =>
        supabase.from('menu_items').update({ sort_order: idx }).eq('id', id).eq('category_id', categoryId)
      )
    );
  },

  async bulkSetAvailability(itemIds: string[], isAvailable: boolean): Promise<void> {
    if (itemIds.length === 0) return;
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .in('id', itemIds);
    if (error) throw error;
  },

  async bulkSetVeg(itemIds: string[], isVeg: boolean): Promise<void> {
    if (itemIds.length === 0) return;
    const { error } = await supabase
      .from('menu_items')
      .update({ is_veg: isVeg })
      .in('id', itemIds);
    if (error) throw error;
  },

  async bulkAdjustPricesPercent(itemIds: string[], percent: number): Promise<void> {
    if (itemIds.length === 0 || !Number.isFinite(percent)) return;
    // Fetch current prices, compute new client-side, update individually
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, price')
      .in('id', itemIds);
    if (error) throw error;
    const factor = 1 + percent / 100;
    const updates = (data || []).map((row: any) => ({ id: row.id, price: Math.max(0, Math.round(parseFloat(row.price) * factor)) }));
    await Promise.all(updates.map(u => supabase.from('menu_items').update({ price: u.price }).eq('id', u.id)));
  },
};
