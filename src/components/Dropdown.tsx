import { useState, useRef, useEffect, useCallback } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  badge?: string;
  group?: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: string;
  label?: string;
  className?: string;
  searchable?: boolean;
}

export function Dropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  icon,
  label,
  className = '',
  searchable = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable && search
    ? options.filter((o) => 
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const group = opt.group || '';
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, DropdownOption[]>);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightIndex]) {
          handleSelect(filteredOptions[highlightIndex].value);
        }
        break;
    }
  }, [isOpen, filteredOptions, highlightIndex, handleSelect]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  return (
    <div 
      ref={containerRef} 
      className={`dropdown ${className} ${isOpen ? 'open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {label && <span className="dropdown-label">{label}</span>}
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {icon && <span className="dropdown-icon">{icon}</span>}
        <span className="dropdown-value" style={selectedOption?.color ? { color: selectedOption.color } : undefined}>
          {selectedOption?.icon && <span className="option-icon">{selectedOption.icon}</span>}
          {selectedOption?.label || placeholder}
        </span>
        {selectedOption?.badge && (
          <span className="dropdown-badge">{selectedOption.badge}</span>
        )}
        <svg className="dropdown-chevron" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="listbox">
          {searchable && (
            <div className="dropdown-search">
              <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dropdown-search-input"
              />
            </div>
          )}
          <div className="dropdown-options">
            {Object.entries(groupedOptions).map(([group, opts]) => (
              <div key={group || 'default'} className="dropdown-group">
                {group && <div className="dropdown-group-label">{group}</div>}
                {opts.map((opt) => {
                  const globalIdx = filteredOptions.indexOf(opt);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`dropdown-option ${opt.value === value ? 'selected' : ''} ${globalIdx === highlightIndex ? 'highlighted' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                      role="option"
                      aria-selected={opt.value === value}
                      style={opt.color ? { '--option-color': opt.color } as React.CSSProperties : undefined}
                    >
                      {opt.icon && <span className="option-icon">{opt.icon}</span>}
                      <span className="option-label">{opt.label}</span>
                      {opt.badge && <span className="option-badge">{opt.badge}</span>}
                      {opt.value === value && (
                        <svg className="option-check" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="dropdown-empty">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
