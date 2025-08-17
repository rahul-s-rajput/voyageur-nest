import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useProperty } from '../../contexts/PropertyContext';
import { menuService } from '../../services/menuService';
import type { MenuCategory, MenuItem } from '../../types/fnb';
import { MenuStorageService } from '../../lib/menuStorage';

const breakpoint = 768; // mobile < 768

const DottedLine: React.FC = () => (
  <span aria-hidden className="flex-1 mx-2 border-b border-dotted border-gray-300" />
);

const VegIcon: React.FC<{ isVeg: boolean; size?: number }> = ({ isVeg, size = 14 }) => (
  <span
    className={`relative inline-block border rounded-sm ${isVeg ? 'border-green-600' : 'border-red-600'}`}
    style={{ width: size, height: size }}
    aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
  >
    <span
      className={`absolute inset-0 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}
      style={{ margin: Math.max(2, Math.floor(size / 5)) }}
    />
  </span>
);

const formatCurrency = (amount: number, currency: string = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const MenuItemRow: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="flex items-start justify-between py-2">
    <div className="flex items-start gap-3 min-w-0">
      {item.photoPath && (
        <img
          src={item.photoPath.startsWith('http') ? item.photoPath : '#'}
          alt={item.name}
          className="w-10 h-10 rounded object-cover border flex-shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <span className="text-gray-800 leading-snug break-words pr-2 flex items-center gap-2">
        <VegIcon isVeg={!!item.isVeg} size={12} />
        <span className="break-words">{item.name}</span>
      </span>
    </div>
    <div className="flex items-center flex-1 min-w-0">
      <DottedLine />
      <span className="text-gray-900 font-semibold ml-2">{formatCurrency(item.price, item.currency || 'INR')}</span>
    </div>
  </div>
);

const VegLegend: React.FC = () => (
  <div className="flex items-center gap-4 text-xs text-gray-600">
    <span className="flex items-center gap-1"><VegIcon isVeg size={10} /> Veg</span>
    <span className="flex items-center gap-1"><VegIcon isVeg={false} size={10} /> Non‑veg</span>
  </div>
);

const SkeletonItem: React.FC = () => (
  <div className="flex items-start justify-between py-2 animate-pulse">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded bg-gray-200" />
      <div className="h-3 w-40 bg-gray-200 rounded" />
    </div>
    <div className="flex-1 flex items-center min-w-0 ml-2">
      <DottedLine />
      <div className="h-3 w-12 bg-gray-200 rounded ml-2" />
    </div>
  </div>
);

const FullPageLoading: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-6">
    <div className="rounded-xl overflow-hidden border">
      <div className="h-36 sm:h-48 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="mt-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonItem key={idx} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="bg-white rounded-md border p-3">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 min-w-0">
        {item.photoPath && (
          <img
            src={item.photoPath.startsWith('http') ? item.photoPath : '#'}
            alt={item.name}
            className="w-10 h-10 rounded object-cover border flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <span className="text-gray-800 leading-snug break-words pr-2 flex items-center gap-2">
          <VegIcon isVeg={!!item.isVeg} size={12} />
          <span className="break-words">{item.name}</span>
        </span>
      </div>
      <div className="flex items-center flex-1 min-w-0">
        <DottedLine />
        <span className="text-gray-900 font-semibold ml-2">{formatCurrency(item.price, item.currency || 'INR')}</span>
      </div>
    </div>
  </div>
);

const CategoryPanel: React.FC<{ title: string; items: MenuItem[]; bannerUrl?: string; loading?: boolean } > = ({ title, items, bannerUrl, loading }) => (
  <div className="bg-white border rounded-lg overflow-hidden">
    {bannerUrl && (
      <div className="w-full h-32 sm:h-44 md:h-52 bg-gray-100 overflow-hidden">
        <img src={bannerUrl} alt={title} className="w-full h-full object-cover" />
      </div>
    )}
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold tracking-wide uppercase">{title}</h3>
        <VegLegend />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => <SkeletonItem key={idx} />)
          : items.map(i => (<MenuItemCard key={i.id} item={i} />))}
      </div>
    </div>
  </div>
);

const MenuPage: React.FC = () => {
  const { currentProperty } = useProperty();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItem[]>>({});
  const { currentLanguage } = useTranslation('en-IN');
  const [loadingByCategory, setLoadingByCategory] = useState<Record<string, boolean>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < breakpoint);

  const branding = currentProperty?.branding || {};
  const accent = branding.theme_color || '#4F46E5';
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!currentProperty?.id) return;
      setLoadingCategories(true);
      const cats = await menuService.listCategoriesLocalized(currentProperty.id, currentLanguage);
      // Sign category banners first
      const updatedCats = await Promise.all(cats.map(async (c) => {
        if (c.photoPath && !c.photoPath.startsWith('http')) {
          try { return { ...c, photoPath: await MenuStorageService.getSignedUrl(c.photoPath) }; } catch { return c; }
        }
        return c;
      }));
      setCategories(updatedCats);
      const firstId = updatedCats[0]?.id ?? null;
      setActiveCategoryId(firstId);

      // Lazy-load items per category in parallel to avoid blocking render
      const loadItems = async (catId: string) => {
        setLoadingByCategory(prev => ({ ...prev, [catId]: true }));
        try {
          const items = await menuService.listItems({ propertyId: currentProperty.id!, categoryId: catId, availableOnly: true, locale: currentLanguage });
          const signed = await Promise.all(items.map(async (it) => {
            if (it.photoPath && !it.photoPath.startsWith('http')) {
              try { const url = await MenuStorageService.getSignedUrl(it.photoPath); return { ...it, photoPath: url }; } catch { return it; }
            }
            return it;
          }));
          setItemsByCategory(prev => ({ ...prev, [catId]: signed }));
        } finally {
          setLoadingByCategory(prev => ({ ...prev, [catId]: false }));
        }
      };

      await Promise.all(updatedCats.map(c => loadItems(c.id)));
      setLoadingCategories(false);
    };
    load();
  }, [currentProperty?.id, currentLanguage]);

  const activeItems = useMemo(() => {
    if (!activeCategoryId) return [] as MenuItem[];
    return itemsByCategory[activeCategoryId] || [];
  }, [activeCategoryId, itemsByCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menu</h1>
          <VegLegend />
        </div>
      </div>

      {/* Desktop/Tablet: tabs */}
      {!isMobile && (
        <div>
          <div className="flex flex-wrap gap-2 justify-center mb-6 mt-4">
            {loadingCategories && categories.length === 0 && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
              ))
            )}
            {!loadingCategories && categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-2 rounded-md border transition-colors ${activeCategoryId === cat.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
              >
                <span className="flex items-center gap-2">
                  {cat.photoPath && (
                    <img src={cat.photoPath} alt="" className="w-5 h-5 rounded object-cover border" />
                  )}
                  <span>{cat.name}</span>
                </span>
              </button>
            ))}
          </div>

      {loadingCategories && categories.length === 0 ? (
        <FullPageLoading />
      ) : (
            <CategoryPanel
              title={categories.find(c => c.id === activeCategoryId)?.name || ''}
              items={activeItems}
              bannerUrl={categories.find(c => c.id === activeCategoryId)?.photoPath}
              loading={activeCategoryId ? !!loadingByCategory[activeCategoryId] : true}
            />
          )}
        </div>
      )}

      {/* Mobile: accordion */}
      {isMobile && (
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const opened = activeCategoryId ? activeCategoryId === cat.id : idx === 0;
            const toggle = () => setActiveCategoryId(opened ? '' : cat.id);
            const items = itemsByCategory[cat.id] || [];
            return (
              <div key={cat.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={toggle}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 text-white"
                  aria-expanded={opened}
                  aria-controls={`section-${cat.id}`}
                >
                  <span className="font-semibold uppercase tracking-wide">{cat.name}</span>
                  <span className="text-xl">{opened ? '×' : '+'}</span>
                </button>
                {opened && (
                  <div id={`section-${cat.id}`} className="bg-white p-4">
                    {loadingByCategory[cat.id]
                      ? Array.from({ length: 6 }).map((_, idx) => <SkeletonItem key={idx} />)
                      : items.map(i => (<MenuItemRow key={i.id} item={i} />))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenuPage;
