import React, { useEffect, useState } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { menuService } from '../../services/menuService';
import type { MenuCategory, MenuItem } from '../../types/fnb';
import { useNotification } from '../NotificationContainer';
import { MenuStorageService } from '../../lib/menuStorage';

const formatCurrency = (amount: number, currency: string = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const CategoryForm: React.FC<{ onCreate: (name: string) => Promise<void> }> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="mt-3 flex items-center space-x-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try { await onCreate(name.trim()); setName(''); } finally { setSubmitting(false); }
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name"
        className="flex-1 border rounded-md px-3 py-2 text-sm"
      />
      <button disabled={submitting} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
        Add
      </button>
    </form>
  );
};

const AddItemForm: React.FC<{ onCreate: (name: string, price: number, isVeg: boolean, tags?: string[], seasonal?: string[], hiName?: string) => Promise<void> }> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [isVeg, setIsVeg] = useState(true);
  const [tags, setTags] = useState('');
  const [seasonal, setSeasonal] = useState('');
  const [hiName, setHiName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      className="mt-3 grid grid-cols-1 sm:grid-cols-6 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const value = Number(price);
        if (!name.trim() || Number.isNaN(value)) return;
        setSubmitting(true);
        try {
          await onCreate(
            name.trim(),
            value,
            isVeg,
            tags.split(',').map(s => s.trim()).filter(Boolean),
            seasonal.split(',').map(s => s.trim()).filter(Boolean),
            hiName.trim() || undefined
          );
          setName(''); setPrice(''); setIsVeg(true); setTags(''); setSeasonal(''); setHiName('');
        } finally { setSubmitting(false); }
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="border rounded-md px-3 py-2 text-sm" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="border rounded-md px-3 py-2 text-sm" />
      <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} /><span>Veg</span></label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags (comma)" className="border rounded-md px-3 py-2 text-sm" />
      <input value={seasonal} onChange={(e) => setSeasonal(e.target.value)} placeholder="seasonal (comma)" className="border rounded-md px-3 py-2 text-sm" />
      <input value={hiName} onChange={(e) => setHiName(e.target.value)} placeholder="Hindi name (optional)" className="border rounded-md px-3 py-2 text-sm col-span-2" />
      <button disabled={submitting} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50 col-span-1">Add Item</button>
    </form>
  );
};

const EditItemModal: React.FC<{
  item: MenuItem | null;
  onClose: () => void;
  onSave: (updates: Partial<MenuItem>) => Promise<void>;
}> = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<MenuItem>>({});
  useEffect(() => { if (item) setForm({
    name: item.name,
    price: item.price,
    isVeg: item.isVeg,
    isAvailable: item.isAvailable,
    description: item.description || '',
    tags: item.tags || [],
    seasonalFlags: item.seasonalFlags || [],
    allergens: item.allergens || [],
    ingredients: item.ingredients || [],
    nameI18n: item.nameI18n || {}
  }); }, [item]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Item</h3>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-gray-700">Name</span>
            <input className="border rounded px-3 py-2" value={form.name || ''} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} />
          </label>
          <label className="space-y-1">
            <span className="text-gray-700">Hindi name (hi-IN)</span>
            <input className="border rounded px-3 py-2" value={(form.nameI18n as any)?.['hi-IN'] || ''} onChange={(e)=>setForm(f=>({...f, nameI18n: { ...(f.nameI18n||{}), ['hi-IN']: e.target.value }}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Description</span>
            <textarea className="border rounded px-3 py-2" rows={3} value={form.description || ''} onChange={(e)=>setForm(f=>({...f, description:e.target.value}))} />
          </label>
          <label className="space-y-1">
            <span className="text-gray-700">Price</span>
            <input type="number" className="border rounded px-3 py-2" value={form.price ?? 0} onChange={(e)=>setForm(f=>({...f, price:Number(e.target.value)}))} />
            <div className="text-xs text-gray-500">{formatCurrency(Number(form.price ?? 0), item.currency)}</div>
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isVeg} onChange={(e)=>setForm(f=>({...f, isVeg:e.target.checked}))} />Veg</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isAvailable} onChange={(e)=>setForm(f=>({...f, isAvailable:e.target.checked}))} />Available</label>
          </div>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Tags (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.tags||[]).join(', ')} onChange={(e)=>setForm(f=>({...f, tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Seasonal flags (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.seasonalFlags||[]).join(', ')} onChange={(e)=>setForm(f=>({...f, seasonalFlags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Allergens (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.allergens||[]).join(', ')} onChange={(e)=>setForm(f=>({...f, allergens:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Ingredients (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.ingredients||[]).join(', ')} onChange={(e)=>setForm(f=>({...f, ingredients:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
          </label>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-100">Cancel</button>
          <button onClick={()=> onSave(form)} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
        </div>
      </div>
    </div>
  );
};

const AddItemModal: React.FC<{
  onClose: () => void;
  onCreate: (input: {
    name: string;
    nameI18n?: Record<string, string>;
    description?: string;
    price: number;
    cost?: number;
    isVeg: boolean;
    isAvailable: boolean;
    tags?: string[];
    seasonalFlags?: string[];
    allergens?: string[];
    ingredients?: string[];
  }) => Promise<void>;
}> = ({ onClose, onCreate }) => {
  const [form, setForm] = useState<any>({ isVeg: true, isAvailable: true, price: 0, nameI18n: {} });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Add Item</h3>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-gray-700">Name</span>
            <input className="border rounded px-3 py-2" value={form.name || ''} onChange={(e)=>setForm((f:any)=>({...f, name:e.target.value}))} />
          </label>
          <label className="space-y-1">
            <span className="text-gray-700">Hindi name (hi-IN)</span>
            <input className="border rounded px-3 py-2" value={(form.nameI18n||{})['hi-IN'] || ''} onChange={(e)=>setForm((f:any)=>({...f, nameI18n: { ...(f.nameI18n||{}), ['hi-IN']: e.target.value }}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Description</span>
            <textarea className="border rounded px-3 py-2" rows={3} value={form.description || ''} onChange={(e)=>setForm((f:any)=>({...f, description:e.target.value}))} />
          </label>
          <label className="space-y-1">
            <span className="text-gray-700">Price</span>
            <input type="number" step="0.01" inputMode="decimal" className="border rounded px-3 py-2" value={Number(form.price || 0).toFixed(2)} onChange={(e)=>{
              const parsed = Number(e.target.value);
              if (Number.isNaN(parsed)) return;
              setForm((f:any)=>({...f, price: Math.round(parsed*100)/100 }));
            }} />
            <div className="text-xs text-gray-500">{formatCurrency(Number(form.price || 0), 'INR')}</div>
          </label>
          <label className="space-y-1">
            <span className="text-gray-700">Cost (optional)</span>
            <input type="number" step="0.01" inputMode="decimal" className="border rounded px-3 py-2" value={form.cost != null ? Number(form.cost).toFixed(2) : ''} onChange={(e)=>{
              const parsed = Number(e.target.value);
              if (Number.isNaN(parsed)) { setForm((f:any)=>({...f, cost: '' })); return; }
              setForm((f:any)=>({...f, cost: Math.round(parsed*100)/100 }));
            }} placeholder="0.00" />
            {form.cost != null && form.cost !== '' && Number.isFinite(Number(form.cost)) && (
              <div className="text-xs text-gray-500">{formatCurrency(Number(form.cost), 'INR')}</div>
            )}
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isVeg} onChange={(e)=>setForm((f:any)=>({...f, isVeg:e.target.checked}))} />Veg</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isAvailable} onChange={(e)=>setForm((f:any)=>({...f, isAvailable:e.target.checked}))} />Available</label>
          </div>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Tags (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.tags||[]).join(', ')} onChange={(e)=>setForm((f:any)=>({...f, tags:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Seasonal flags (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.seasonalFlags||[]).join(', ')} onChange={(e)=>setForm((f:any)=>({...f, seasonalFlags:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Allergens (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.allergens||[]).join(', ')} onChange={(e)=>setForm((f:any)=>({...f, allergens:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)}))} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-gray-700">Ingredients (comma)</span>
            <input className="border rounded px-3 py-2" value={(form.ingredients||[]).join(', ')} onChange={(e)=>setForm((f:any)=>({...f, ingredients:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)}))} />
          </label>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-100">Cancel</button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white"
            onClick={async ()=>{
              if (!form.name || !Number.isFinite(form.price)) return;
              await onCreate({
                name: form.name,
                nameI18n: form.nameI18n,
                description: form.description,
                price: Number(form.price),
                cost: form.cost != null && form.cost !== '' ? Number(form.cost) : undefined,
                isVeg: !!form.isVeg,
                isAvailable: !!form.isAvailable,
                tags: form.tags || [],
                seasonalFlags: form.seasonalFlags || [],
                allergens: form.allergens || [],
                ingredients: form.ingredients || [],
              });
            }}
          >Create</button>
        </div>
      </div>
    </div>
  );
};

const MenuManagement: React.FC = () => {
  const { currentProperty } = useProperty();
  const { showError, showSuccess } = useNotification();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showAddItem, setShowAddItem] = useState(false);
  const [lastBulk, setLastBulk] = useState<null | { type: 'availability' | 'veg' | 'price'; ids: string[]; previous: Record<string, any>; timer?: number }>(null);

  const toggleSelect = (id: string) => setSelectedItemIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedItemIds(new Set());

  useEffect(() => {
    const load = async () => {
      if (!currentProperty?.id) return;
      setLoading(true);
      try {
        const catsRaw = await menuService.listCategories(currentProperty.id);
        const cats = await Promise.all(catsRaw.map(async (c) => {
          if (c.photoPath && !c.photoPath.startsWith('http')) {
            try { return { ...c, photoPath: await MenuStorageService.getSignedUrl(c.photoPath) }; } catch { return c; }
          }
          return c;
        }));
        setCategories(cats);
        const defaultCat = cats[0]?.id || null;
        setSelectedCategoryId(defaultCat);
        if (defaultCat) {
          const it = await menuService.listItems({ propertyId: currentProperty.id, categoryId: defaultCat, availableOnly });
          const withSigned = await Promise.all(it.map(async (x) => {
            if (x.photoPath && !x.photoPath.startsWith('http')) {
              try { const url = await MenuStorageService.getSignedUrl(x.photoPath); return { ...x, photoPath: url }; } catch { return x; }
            }
            return x;
          }));
          setItems(withSigned);
        }
      } catch (e: any) {
        showError('Failed to load menu', e?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProperty?.id, availableOnly, showError]);

  useEffect(() => {
    const loadItems = async () => {
      if (!currentProperty?.id || !selectedCategoryId) return;
      try {
        const it = await menuService.listItems({ propertyId: currentProperty.id, categoryId: selectedCategoryId, availableOnly });
        const withSigned = await Promise.all(it.map(async (x) => {
          if (x.photoPath && !x.photoPath.startsWith('http')) {
            try { const url = await MenuStorageService.getSignedUrl(x.photoPath); return { ...x, photoPath: url }; } catch { return x; }
          }
          return x;
        }));
        setItems(withSigned);
      } catch (e: any) {
        showError('Failed to load items', e?.message || 'Unknown error');
      }
    };
    loadItems();
  }, [currentProperty?.id, selectedCategoryId, availableOnly, showError]);

  const reloadCurrentCategoryItems = async () => {
    if (!currentProperty?.id || !selectedCategoryId) return;
    try {
      const it = await menuService.listItems({ propertyId: currentProperty.id, categoryId: selectedCategoryId, availableOnly });
      const withSigned = await Promise.all(it.map(async (x) => {
        if (x.photoPath && !x.photoPath.startsWith('http')) {
          try { const url = await MenuStorageService.getSignedUrl(x.photoPath); return { ...x, photoPath: url }; } catch { return x; }
        }
        return x;
      }));
      setItems(withSigned);
    } catch (e: any) {
      showError('Failed to load items', e?.message || 'Unknown error');
    }
  };

  // Simple drag-to-reorder (mouse-only)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent<HTMLButtonElement>) => { e.preventDefault(); };
  const onDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setCategories(reordered);
    setDragIdx(null);
    try {
      if (currentProperty?.id) {
        await menuService.reorderCategories(currentProperty.id, reordered.map(c => c.id));
        showSuccess('Categories reordered');
      }
    } catch (e: any) {
      showError('Failed to save order', e?.message || 'Unknown error');
    }
  };

  const saveCategoryRename = async (cat: MenuCategory) => {
    try {
      const updated = await menuService.updateCategory(cat.id, { name: editingCategoryName });
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c));
      setEditingCategoryId(null);
    } catch (e: any) {
      showError('Rename failed', e?.message || 'Unknown error');
    }
  };

  const exportJSON = async () => {
    if (!currentProperty?.id) return;
    const payload = {
      propertyId: currentProperty.id,
      categories: await menuService.listCategories(currentProperty.id),
      items: await menuService.listItems({ propertyId: currentProperty.id })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${currentProperty.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    if (!currentProperty?.id) return;
    const cats = await menuService.listCategories(currentProperty.id);
    const itemsAll = await menuService.listItems({ propertyId: currentProperty.id });
    const catMap = new Map(cats.map(c => [c.id, c.name]));
    const rows = [
      ['category', 'name', 'price', 'currency', 'isVeg', 'isAvailable', 'tags', 'seasonal', 'allergens'].join(',')
    ];
    for (const it of itemsAll) {
      rows.push([
        JSON.stringify(catMap.get(it.categoryId) || ''),
        JSON.stringify(it.name),
        String(it.price),
        it.currency,
        String(it.isVeg),
        String(it.isAvailable),
        JSON.stringify((it.tags||[]).join('|')),
        JSON.stringify((it.seasonalFlags||[]).join('|')),
        JSON.stringify((it.allergens||[]).join('|'))
      ].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${currentProperty.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredItems = items
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !vegOnly || i.isVeg);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Menu Management</h2>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Categories</h3>
            <div className="space-y-1">
              {categories.map((c, idx) => (
                <div key={c.id} className={`w-full px-3 py-2 rounded-md flex items-center justify-between ${selectedCategoryId === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                  <button
                    className="truncate text-left flex-1"
                    onClick={() => setSelectedCategoryId(c.id)}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(idx)}
                    title="Drag to reorder"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded overflow-hidden border bg-gray-50 flex-shrink-0">
                        {c.photoPath ? (
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-ignore
                          <img src={c.photoPath} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      {editingCategoryId === c.id ? (
                      <input
                        autoFocus
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={editingCategoryName}
                        onChange={(e)=>setEditingCategoryName(e.target.value)}
                        onBlur={()=> saveCategoryRename(c)}
                        onKeyDown={(e)=>{ if (e.key==='Enter') saveCategoryRename(c); }}
                      />
                      ) : <span className="truncate">{c.name}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-2">
                    <button className="text-xs text-gray-500" onClick={()=>{ setEditingCategoryId(c.id); setEditingCategoryName(c.name); }}>Rename</button>
                    <label className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5 cursor-pointer">
                      Banner
                      <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = '';
                        if (!file) return;
                        try {
                          if (!currentProperty?.id) return;
                          const { path } = await MenuStorageService.uploadCategoryPhoto(currentProperty.id, c.id, file);
                          const updated = await menuService.updateCategory(c.id, { photoPath: path });
                          const signed = updated.photoPath && !updated.photoPath.startsWith('http')
                            ? { ...updated, photoPath: await MenuStorageService.getSignedUrl(updated.photoPath) }
                            : updated;
                          setCategories(prev => prev.map(x => x.id === c.id ? signed : x));
                          showSuccess('Category banner updated');
                        } catch (err: any) {
                          showError('Failed to upload banner', err?.message || 'Unknown error');
                        }
                      }} />
                    </label>
                    {c.photoPath && (
                      <button className="text-xs text-red-600" onClick={async ()=>{
                        try {
                          const path = (c.photoPath || '').replace(/^https?:\/\/[^\s]+\/storage\/v1\/object\/sign\/menu-photos\//, '').split('?')[0];
                          if (path) await MenuStorageService.deleteCategoryPhoto(path);
                        } catch {}
                        try {
                          const updated = await menuService.updateCategory(c.id, { photoPath: '' });
                          setCategories(prev => prev.map(x => x.id === c.id ? { ...updated, photoPath: undefined } : x));
                          showSuccess('Banner removed');
                        } catch (err: any) {
                          showError('Failed to remove banner', err?.message || 'Unknown error');
                        }
                      }}>Remove</button>
                    )}
                    <button
                      className={`text-xs ${c.isActive ? 'text-green-700' : 'text-gray-500'}`}
                      onClick={async()=>{
                        try {
                          const updated = await menuService.updateCategory(c.id, { isActive: !c.isActive });
                          setCategories(prev => prev.map(x => x.id === c.id ? updated : x));
                        } catch (e: any) {
                          showError('Failed to toggle category', e?.message || 'Unknown error');
                        }
                      }}
                    >{c.isActive ? 'Active' : 'Inactive'}</button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-sm text-gray-500">No categories yet.</div>
              )}
            </div>
            <CategoryForm onCreate={async (name) => {
              try {
                if (!currentProperty?.id) return;
                const created = await menuService.createCategory(currentProperty.id, { name });
                setCategories(prev => [...prev, created]);
              } catch (e: any) {
                showError('Failed to create category', e?.message || 'Unknown error');
              }
            }} />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">Items</h3>
                  <span className="text-xs text-gray-500">{filteredItems.length} shown</span>
                  <button className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs" onClick={()=> setShowAddItem(true)}>Add Item</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />Veg only</label>
                  <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />Available only</label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="border rounded-md px-3 py-2 text-sm flex-1"
                />
                <button onClick={exportJSON} className="px-3 py-2 text-xs rounded bg-gray-100">Export JSON</button>
                <button onClick={exportCSV} className="px-3 py-2 text-xs rounded bg-gray-100">Export CSV</button>
              </div>
            </div>
            {selectedItemIds.size > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">{selectedItemIds.size} selected</span>
                <button className="text-xs px-2 py-1 rounded bg-gray-100" onClick={clearSelection}>Clear</button>
                <button className="text-xs px-2 py-1 rounded bg-green-50 text-green-700" onClick={async ()=>{
                  const ids = Array.from(selectedItemIds);
                  const prevMap: Record<string, boolean> = {};
                  for (const p of items) { if (selectedItemIds.has(p.id)) prevMap[p.id] = p.isAvailable; }
                  try { await menuService.bulkSetAvailability(ids, true); setItems(prev => prev.map(p => selectedItemIds.has(p.id) ? { ...p, isAvailable: true } : p));
                    const timer = window.setTimeout(()=> setLastBulk(null), 8000);
                    setLastBulk({ type: 'availability', ids, previous: prevMap, timer });
                    showSuccess('Marked available');
                  } catch(e:any){ showError('Failed', e?.message||'Unknown error'); }
                }}>Show</button>
                <button className="text-xs px-2 py-1 rounded bg-gray-100" onClick={async ()=>{
                  const ids = Array.from(selectedItemIds);
                  const prevMap: Record<string, boolean> = {};
                  for (const p of items) { if (selectedItemIds.has(p.id)) prevMap[p.id] = p.isAvailable; }
                  try { await menuService.bulkSetAvailability(ids, false); setItems(prev => prev.map(p => selectedItemIds.has(p.id) ? { ...p, isAvailable: false } : p));
                    const timer = window.setTimeout(()=> setLastBulk(null), 8000);
                    setLastBulk({ type: 'availability', ids, previous: prevMap, timer });
                    showSuccess('Hidden'); } catch(e:any){ showError('Failed', e?.message||'Unknown error'); }
                }}>Hide</button>
                <button className="text-xs px-2 py-1 rounded bg-green-50 text-green-700" onClick={async ()=>{
                  const ids = Array.from(selectedItemIds);
                  const prevMap: Record<string, boolean> = {};
                  for (const p of items) { if (selectedItemIds.has(p.id)) prevMap[p.id] = p.isVeg; }
                  try { await menuService.bulkSetVeg(ids, true); setItems(prev => prev.map(p => selectedItemIds.has(p.id) ? { ...p, isVeg: true } : p));
                    const timer = window.setTimeout(()=> setLastBulk(null), 8000);
                    setLastBulk({ type: 'veg', ids, previous: prevMap, timer });
                    showSuccess('Set Veg'); } catch(e:any){ showError('Failed', e?.message||'Unknown error'); }
                }}>Veg</button>
                <button className="text-xs px-2 py-1 rounded bg-red-50 text-red-700" onClick={async ()=>{
                  const ids = Array.from(selectedItemIds);
                  const prevMap: Record<string, boolean> = {};
                  for (const p of items) { if (selectedItemIds.has(p.id)) prevMap[p.id] = p.isVeg; }
                  try { await menuService.bulkSetVeg(ids, false); setItems(prev => prev.map(p => selectedItemIds.has(p.id) ? { ...p, isVeg: false } : p));
                    const timer = window.setTimeout(()=> setLastBulk(null), 8000);
                    setLastBulk({ type: 'veg', ids, previous: prevMap, timer });
                    showSuccess('Set Non‑veg'); } catch(e:any){ showError('Failed', e?.message||'Unknown error'); }
                }}>Non‑veg</button>
                <div className="flex items-center gap-1 text-xs">
                  <span>Price ±%</span>
                  <input id="bulkPct" type="number" className="w-16 border rounded px-1 py-0.5" defaultValue={10} />
                  <button className="px-2 py-1 rounded bg-blue-600 text-white" onClick={async ()=>{
                    const el = document.getElementById('bulkPct') as HTMLInputElement | null;
                    const pct = el ? Number(el.value) : NaN;
                    if (Number.isNaN(pct)) return;
                    try {
                      const ids = Array.from(selectedItemIds);
                      const prevMap: Record<string, number> = {};
                      for (const p of items) { if (selectedItemIds.has(p.id)) prevMap[p.id] = p.price; }
                      await menuService.bulkAdjustPricesPercent(ids, pct);
                      await reloadCurrentCategoryItems();
                      const timer = window.setTimeout(()=> setLastBulk(null), 8000);
                      setLastBulk({ type: 'price', ids, previous: prevMap, timer });
                      showSuccess('Prices updated');
                    } catch (e:any) {
                      showError('Failed', e?.message || 'Unknown error');
                    }
                  }}>Apply</button>
                </div>
                <button className="text-xs px-2 py-1 rounded bg-gray-100" onClick={() => {
                  // Select all filtered items currently visible
                  const next = new Set(selectedItemIds);
                  for (const it of filteredItems) { next.add(it.id); }
                  setSelectedItemIds(next);
                }}>Select filtered</button>
                <button className="text-xs px-2 py-1 rounded bg-gray-100" onClick={async () => {
                  // Select all items in the current category (ignoring filters)
                  if (!currentProperty?.id || !selectedCategoryId) return;
                  try {
                    const all = await menuService.listItems({ propertyId: currentProperty.id, categoryId: selectedCategoryId });
                    setSelectedItemIds(new Set(all.map(a => a.id)));
                  } catch {}
                }}>Select all in category</button>
                <button className="text-xs px-2 py-1 rounded bg-gray-100" onClick={clearSelection}>Select none</button>
              </div>
            )}
            {selectedItemIds.size === 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <button className="px-2 py-1 rounded bg-gray-100" onClick={() => {
                  const next = new Set<string>();
                  for (const it of filteredItems) { next.add(it.id); }
                  setSelectedItemIds(next);
                }}>Select filtered</button>
                <button className="px-2 py-1 rounded bg-gray-100" onClick={async () => {
                  if (!currentProperty?.id || !selectedCategoryId) return;
                  try {
                    const all = await menuService.listItems({ propertyId: currentProperty.id, categoryId: selectedCategoryId });
                    setSelectedItemIds(new Set(all.map(a => a.id)));
                  } catch {}
                }}>Select all in category</button>
              </div>
            )}

            {lastBulk && (
              <div className="mb-3 flex items-center justify-between rounded border bg-yellow-50 text-yellow-900 px-3 py-2 text-sm">
                <span>
                  {lastBulk.type === 'price' ? 'Price changes applied.' : lastBulk.type === 'veg' ? 'Veg status updated.' : 'Availability updated.'}
                </span>
                <div className="flex items-center gap-2">
                  <button className="underline" onClick={async ()=>{
                    // Undo handler
                    const { type, ids, previous, timer } = lastBulk;
                    if (timer) window.clearTimeout(timer);
                    try {
                      if (type === 'availability') {
                        const groupTrue: string[] = [];
                        const groupFalse: string[] = [];
                        for (const id of ids) { (previous[id] ? groupTrue : groupFalse).push(id); }
                        if (groupTrue.length) await menuService.bulkSetAvailability(groupTrue, true);
                        if (groupFalse.length) await menuService.bulkSetAvailability(groupFalse, false);
                        setItems(prev => prev.map(p => ids.includes(p.id) ? { ...p, isAvailable: previous[p.id] } : p));
                      } else if (type === 'veg') {
                        const groupTrue: string[] = [];
                        const groupFalse: string[] = [];
                        for (const id of ids) { (previous[id] ? groupTrue : groupFalse).push(id); }
                        if (groupTrue.length) await menuService.bulkSetVeg(groupTrue, true);
                        if (groupFalse.length) await menuService.bulkSetVeg(groupFalse, false);
                        setItems(prev => prev.map(p => ids.includes(p.id) ? { ...p, isVeg: previous[p.id] } : p));
                      } else if (type === 'price') {
                        await Promise.all(ids.map((id) => menuService.updateItem(id, { price: previous[id] })));
                        await reloadCurrentCategoryItems();
                      }
                      setLastBulk(null);
                    } catch (e:any) {
                      showError('Undo failed', e?.message || 'Unknown error');
                    }
                  }}>Undo</button>
                  <button className="text-yellow-800" onClick={()=>{ if (lastBulk?.timer) window.clearTimeout(lastBulk.timer); setLastBulk(null); }}>Dismiss</button>
                </div>
              </div>
            )}
            <div className="divide-y">
              {filteredItems
                .map((i, idx, arr) => (
                <div
                  key={i.id}
                  className="py-2 flex items-center justify-between gap-4"
                  draggable
                  onDragStart={() => setDragItemIdx(idx)}
                  onDragOver={(e)=>{ e.preventDefault(); setDragOverItemIdx(idx); }}
                  onDrop={async ()=>{
                    if (dragItemIdx === null || dragItemIdx === idx) return;
                    const filtered = arr; // already filtered list order
                    const all = [...items];
                    const currentOrderIds = filtered.map(x => x.id);
                    const [moved] = filtered.splice(dragItemIdx, 1);
                    filtered.splice(idx, 0, moved);
                    // Merge back into full list order by replacing positions of filtered ids
                    const newOrder: MenuItem[] = [];
                    const filteredSet = new Set(currentOrderIds);
                    let fi = 0;
                    for (const it of items) {
                      if (filteredSet.has(it.id)) {
                        newOrder.push(filtered[fi++]);
                      } else {
                        newOrder.push(it);
                      }
                    }
                    setItems(newOrder);
                    setDragItemIdx(null);
                    setDragOverItemIdx(null);
                    try {
                      await menuService.reorderItems(selectedCategoryId || '', newOrder.filter(x=>x.categoryId=== (selectedCategoryId||'')).map(x=>x.id));
                    } catch (e: any) {
                      showError('Failed to save order', e?.message || 'Unknown error');
                    }
                  }}
                  style={{ opacity: dragOverItemIdx === idx ? 0.8 : 1 }}
                  title="Drag to reorder"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input type="checkbox" className="mt-0.5" checked={selectedItemIds.has(i.id)} onChange={()=>toggleSelect(i.id)} />
                    {/* photo thumb */}
                    <div className="relative w-12 h-12 bg-gray-100 border rounded overflow-hidden flex-shrink-0">
                      {i.photoPath ? (
                        <>
                          <img
                            src={i.photoPath.startsWith('http') ? i.photoPath : '#'}
                            alt={i.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='; }}
                          />
                          <button
                            className="absolute top-0 right-0 m-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] leading-4 flex items-center justify-center"
                            title="Remove photo"
                            onClick={async (e)=>{
                              e.stopPropagation();
                              try {
                                const path = (i.photoPath || '').replace(/^https?:\/\/[^\s]+\/storage\/v1\/object\/sign\/menu-photos\//, '').split('?')[0];
                                if (path) {
                                  await MenuStorageService.deleteItemPhoto(path);
                                }
                              } catch {}
                              try {
                                const updated = await menuService.updateItem(i.id, { photoPath: '' });
                                setItems(prev => prev.map(p => p.id === i.id ? { ...updated, photoPath: undefined } : p));
                                showSuccess('Photo removed');
                              } catch (err: any) {
                                showError('Failed to remove photo', err?.message || 'Unknown error');
                              }
                            }}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Photo</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{i.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{i.isVeg ? 'Veg' : 'Non‑veg'}</span>
                        {i.tags && i.tags.length > 0 && (
                          <span className="truncate">• {i.tags.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={i.price.toFixed(2)}
                      className="w-28 border rounded-md px-2 py-1 text-sm"
                      onChange={(e) => {
                        const raw = e.currentTarget.value;
                        const parsed = Number(raw);
                        if (Number.isNaN(parsed)) return;
                        // Clamp to 2 decimals
                        const normalized = Math.round(parsed * 100) / 100;
                        setItems(prev => prev.map(p => p.id === i.id ? { ...p, price: normalized } : p));
                      }}
                      onBlur={async (e) => {
                        const parsed = Number(e.currentTarget.value);
                        if (!Number.isFinite(parsed)) return;
                        const normalized = Math.round(parsed * 100) / 100;
                        try {
                          const updated = await menuService.updateItem(i.id, { price: normalized });
                          setItems(prev => prev.map(p => p.id === i.id ? updated : p));
                          showSuccess('Price updated');
                        } catch (err: any) {
                          showError('Failed to update price', err?.message || 'Unknown error');
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500 tabular-nums w-20 text-right">
                      {formatCurrency(i.price, i.currency)}
                    </span>
                    <span className="text-xs text-gray-500 mr-2">{i.currency}</span>
                    <button
                      className={`px-2 py-1 rounded-md text-xs ${i.isVeg ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                      onClick={async () => {
                        try {
                          const updated = await menuService.updateItem(i.id, { isVeg: !i.isVeg });
                          setItems(prev => prev.map(p => p.id === i.id ? updated : p));
                        } catch (err: any) {
                          showError('Failed to toggle veg', err?.message || 'Unknown error');
                        }
                      }}
                    >
                      {i.isVeg ? 'Veg' : 'Non‑veg'}
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md text-xs ${i.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      onClick={async () => {
                        try {
                          const updated = await menuService.updateItem(i.id, { isAvailable: !i.isAvailable });
                          setItems(prev => prev.map(p => p.id === i.id ? updated : p));
                        } catch (err: any) {
                          showError('Failed to toggle availability', err?.message || 'Unknown error');
                        }
                      }}
                    >
                      {i.isAvailable ? 'Available' : 'Hidden'}
                    </button>
                    <label className="px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 cursor-pointer">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.currentTarget.files?.[0];
                          e.currentTarget.value = '';
                          if (!file) return;
                          try {
                            if (!currentProperty?.id || !selectedCategoryId) return;
                            const { path } = await MenuStorageService.uploadItemPhoto(currentProperty.id, selectedCategoryId, i.id, file);
                            const updated = await menuService.updateItem(i.id, { photoPath: path });
                            const signed = updated.photoPath && !updated.photoPath.startsWith('http')
                              ? { ...updated, photoPath: await MenuStorageService.getSignedUrl(updated.photoPath) }
                              : updated;
                            setItems(prev => prev.map(p => p.id === i.id ? signed : p));
                            showSuccess('Photo uploaded');
                          } catch (err: any) {
                            showError('Upload failed', err?.message || 'Unknown error');
                          }
                        }}
                      />
                    </label>
                    <button className="px-2 py-1 rounded-md text-xs bg-gray-100" onClick={()=> setEditItem(i)}>Edit</button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-sm text-gray-500 py-4">No items in this category.</div>
              )}
            </div>
            {null}
          </div>
        </div>
      </div>

      <EditItemModal
        item={editItem}
        onClose={()=> setEditItem(null)}
        onSave={async (updates) => {
          if (!editItem) return;
          try {
            const updated = await menuService.updateItem(editItem.id, updates);
            setItems(prev => prev.map(p => p.id === editItem.id ? updated : p));
            setEditItem(null);
            showSuccess('Item updated');
          } catch (e: any) {
            showError('Update failed', e?.message || 'Unknown error');
          }
        }}
      />
      {showAddItem && (
        <AddItemModal
          onClose={()=> setShowAddItem(false)}
          onCreate={async (payload) => {
            try {
              if (!currentProperty?.id || !selectedCategoryId) return;
              const created = await menuService.createItem({
                propertyId: currentProperty.id,
                categoryId: selectedCategoryId,
                name: payload.name,
                nameI18n: payload.nameI18n,
                description: payload.description,
                price: payload.price,
                currency: 'INR',
                cost: payload.cost,
                isAvailable: payload.isAvailable,
                isVeg: payload.isVeg,
                tags: payload.tags || [],
                seasonalFlags: payload.seasonalFlags || [],
                allergens: payload.allergens || [],
                ingredients: payload.ingredients || [],
              } as any);
              setItems(prev => [created, ...prev]);
              setShowAddItem(false);
              showSuccess('Item created');
            } catch (e: any) {
              showError('Failed to create item', e?.message || 'Unknown error');
            }
          }}
        />)
      }
    </div>
  );
};

export default MenuManagement;
