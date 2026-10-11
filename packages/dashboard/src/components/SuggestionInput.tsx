import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Sparkles, Check, X } from 'lucide-react';

export interface SuggestionItem {
  value: string;
  label?: string;
  description?: string;
  category?: string;
  previewColor?: string;
}

interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: SuggestionItem[];
  placeholder?: string;
  className?: string;
  mono?: boolean;
  id?: string;
  title?: string;
  onBlur?: () => void;
}

export const SuggestionInput: React.FC<SuggestionInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  mono = false,
  id,
  title,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  // Filter suggestions dynamically based on user input
  const filteredSuggestions = useMemo(() => {
    if (!value || value.trim() === '') {
      return suggestions;
    }
    const query = value.toLowerCase().trim();
    const matches = suggestions.filter(
      (item) =>
        item.value.toLowerCase().includes(query) ||
        (item.label && item.label.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
    );

    // If query is an exact match for one of the options (e.g. user selected 'display'),
    // show the matched item(s) first, followed by all remaining suggestions
    // so the user can easily switch to any other property without having to delete the text first!
    const isExactMatch = suggestions.some((s) => s.value.toLowerCase() === query);
    if (isExactMatch) {
      const nonMatches = suggestions.filter((s) => !matches.some((m) => m.value === s.value));
      return [...matches, ...nonMatches];
    }

    return matches;
  }, [value, suggestions]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredSuggestions]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (item: SuggestionItem) => {
    justSelectedRef.current = true;
    onChange(item.value);
    setIsOpen(false);
    setTimeout(() => {
      justSelectedRef.current = false;
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (filteredSuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="pw-suggestion-container"
      style={{ position: 'relative', width: '100%' }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={`${className} ${mono ? 'pw-input-mono' : ''}`}
          placeholder={placeholder}
          value={value}
          title={title}
          onChange={(e) => {
            justSelectedRef.current = false;
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (justSelectedRef.current) return;
            setIsOpen(true);
          }}
          onClick={() => {
            if (justSelectedRef.current) return;
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          autoComplete="off"
          style={{ paddingRight: '28px' }}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--pw-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
          title="Toggle recommendations"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="pw-suggestion-dropdown"
          onMouseDown={(e) => {
            // Prevent input blur when clicking inside dropdown
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '260px',
            overflowY: 'auto',
            backgroundColor: 'var(--pw-surface-1)',
            border: '1px solid var(--pw-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            zIndex: 9999,
            padding: '4px',
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--pw-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid var(--pw-border-subtle)',
              marginBottom: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={12} />
            <span>Recommended Choices</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'var(--pw-text-muted)',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
              }}
              title="Close recommendations (Esc)"
            >
              <X size={12} />
            </button>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div
              style={{
                padding: '12px 10px',
                textAlign: 'center',
                color: 'var(--pw-text-muted)',
                fontSize: '12px',
              }}
            >
              No preset matches. You can keep your custom value "{value}".
            </div>
          ) : (
            filteredSuggestions.map((item, idx) => {
              const isSelected = item.value.toLowerCase() === value.toLowerCase().trim();
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${item.category || 'all'}-${item.value}`}
                  data-index={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    backgroundColor: isHighlighted
                      ? 'var(--pw-surface-2)'
                      : isSelected
                      ? 'var(--pw-accent-subtle)'
                      : 'transparent',
                    borderLeft: isHighlighted
                      ? '3px solid var(--pw-accent)'
                      : isSelected
                      ? '3px solid var(--pw-accent)'
                      : '3px solid transparent',
                    transition: 'background-color 100ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {item.previewColor && (
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: item.previewColor,
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: isSelected ? 'var(--pw-accent)' : 'var(--pw-text)',
                            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                          }}
                        >
                          {item.label || item.value}
                        </span>
                        {isSelected && (
                          <Check size={12} color="var(--pw-accent)" />
                        )}
                        {item.category && (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--pw-text-subtle)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--pw-text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: isHighlighted ? 'var(--pw-accent)' : 'var(--pw-text-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
