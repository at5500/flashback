import { useState, useMemo, useRef, useEffect } from 'react';
import { useTemplates, useIncrementTemplateUsage } from '@/hooks';
import type { MessageTemplate } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface TemplateSelectorProps {
  onSelectTemplate: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateSelector({ onSelectTemplate, isOpen, onClose }: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: templates = [], isLoading } = useTemplates();
  const incrementUsage = useIncrementTemplateUsage();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ['all', ...Array.from(cats)];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Sort by usage count
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => b.usage_count - a.usage_count);
  }, [filteredTemplates]);

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template.content);
    incrementUsage.mutate(template.id);
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transition-colors"
      style={{ maxHeight: '400px' }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white transition-colors">{t.templates.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.templates.search_placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
        />
      </div>

      {/* Categories */}
      {categories.length > 1 && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                ${
                  selectedCategory === category
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {category === 'all' ? t.templates.all_categories : category}
            </button>
          ))}
        </div>
      )}

      {/* Templates list */}
      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
            {searchQuery || selectedCategory !== 'all'
              ? t.templates.nothing_found
              : t.templates.no_templates}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate transition-colors">
                        {template.title}
                      </h4>
                      {template.category && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded transition-colors">
                          {template.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 transition-colors">{template.content}</p>
                  </div>
                  {template.usage_count > 0 && (
                    <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 transition-colors">
                      {template.usage_count} {t.templates.times}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
