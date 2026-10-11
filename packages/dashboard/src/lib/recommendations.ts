import type { SuggestionItem } from '../components/SuggestionInput';

export const CSS_PROPERTY_RECOMMENDATIONS: SuggestionItem[] = [
  // Layout & Visibility
  {
    value: 'display',
    label: 'display',
    category: 'Layout',
    description: 'Control element visibility or layout mode (none to hide, flex, block)',
  },
  {
    value: 'visibility',
    label: 'visibility',
    category: 'Layout',
    description: 'Show or hide element while preserving its space on the page',
  },
  {
    value: 'opacity',
    label: 'opacity',
    category: 'Layout',
    description: 'Set transparency (1 = solid, 0.5 = semi-transparent, 0 = invisible)',
  },
  {
    value: 'position',
    label: 'position',
    category: 'Layout',
    description: 'Positioning method (relative, absolute, fixed, static)',
  },
  {
    value: 'z-index',
    label: 'z-index',
    category: 'Layout',
    description: 'Stacking order / layer depth on top of other elements',
  },
  {
    value: 'flex-direction',
    label: 'flex-direction',
    category: 'Layout',
    description: 'Direction of child items (row, column, row-reverse)',
  },
  {
    value: 'align-items',
    label: 'align-items',
    category: 'Layout',
    description: 'Cross-axis alignment (center, flex-start, flex-end, stretch)',
  },
  {
    value: 'justify-content',
    label: 'justify-content',
    category: 'Layout',
    description: 'Main-axis distribution (center, space-between, flex-start)',
  },
  {
    value: 'gap',
    label: 'gap',
    category: 'Layout',
    description: 'Spacing between flex or grid items (e.g. 8px, 16px, 24px)',
  },

  // Colors & Backgrounds
  {
    value: 'background-color',
    label: 'background-color',
    category: 'Colors',
    description: 'Change the background fill color of buttons, cards, or headers',
  },
  {
    value: 'color',
    label: 'color',
    category: 'Colors',
    description: 'Change the font / text color',
  },
  {
    value: 'background',
    label: 'background',
    category: 'Colors',
    description: 'Full background shorthand (color, gradient, image)',
  },

  // Spacing
  {
    value: 'padding',
    label: 'padding',
    category: 'Spacing',
    description: 'Inner space inside element borders (e.g. 8px 16px)',
  },
  {
    value: 'padding-top',
    label: 'padding-top',
    category: 'Spacing',
    description: 'Inner space at the top',
  },
  {
    value: 'padding-bottom',
    label: 'padding-bottom',
    category: 'Spacing',
    description: 'Inner space at the bottom',
  },
  {
    value: 'padding-left',
    label: 'padding-left',
    category: 'Spacing',
    description: 'Inner space on the left',
  },
  {
    value: 'padding-right',
    label: 'padding-right',
    category: 'Spacing',
    description: 'Inner space on the right',
  },
  {
    value: 'margin',
    label: 'margin',
    category: 'Spacing',
    description: 'Outer spacing around element (e.g. 0 auto, 16px)',
  },
  {
    value: 'margin-top',
    label: 'margin-top',
    category: 'Spacing',
    description: 'Outer space above the element',
  },
  {
    value: 'margin-bottom',
    label: 'margin-bottom',
    category: 'Spacing',
    description: 'Outer space below the element',
  },
  {
    value: 'margin-left',
    label: 'margin-left',
    category: 'Spacing',
    description: 'Outer space to the left of the element',
  },
  {
    value: 'margin-right',
    label: 'margin-right',
    category: 'Spacing',
    description: 'Outer space to the right of the element',
  },

  // Sizing
  {
    value: 'width',
    label: 'width',
    category: 'Sizing',
    description: 'Width of the element (e.g. 100%, 300px, auto)',
  },
  {
    value: 'max-width',
    label: 'max-width',
    category: 'Sizing',
    description: 'Maximum allowable width (e.g. 100%, 1200px)',
  },
  {
    value: 'min-width',
    label: 'min-width',
    category: 'Sizing',
    description: 'Minimum width before shrinking',
  },
  {
    value: 'height',
    label: 'height',
    category: 'Sizing',
    description: 'Height of the element (e.g. 48px, 100%, auto)',
  },
  {
    value: 'max-height',
    label: 'max-height',
    category: 'Sizing',
    description: 'Maximum allowable height',
  },
  {
    value: 'min-height',
    label: 'min-height',
    category: 'Sizing',
    description: 'Minimum height threshold',
  },

  // Typography
  {
    value: 'font-size',
    label: 'font-size',
    category: 'Typography',
    description: 'Text size (e.g. 14px, 16px, 18px, 24px)',
  },
  {
    value: 'font-weight',
    label: 'font-weight',
    category: 'Typography',
    description: 'Text boldness (e.g. bold, 600, 500, normal)',
  },
  {
    value: 'line-height',
    label: 'line-height',
    category: 'Typography',
    description: 'Vertical height of text lines (e.g. 1.5, 24px)',
  },
  {
    value: 'text-align',
    label: 'text-align',
    category: 'Typography',
    description: 'Text alignment inside container (center, left, right)',
  },

  // Borders & Corners
  {
    value: 'border-radius',
    label: 'border-radius',
    category: 'Borders',
    description: 'Round corners of buttons or cards (e.g. 8px, 12px, 9999px)',
  },
  {
    value: 'border',
    label: 'border',
    category: 'Borders',
    description: 'Border outline shorthand (e.g. 1px solid #e2e8f0)',
  },
  {
    value: 'border-color',
    label: 'border-color',
    category: 'Borders',
    description: 'Color of the element border',
  },
  {
    value: 'border-width',
    label: 'border-width',
    category: 'Borders',
    description: 'Thickness of the border (e.g. 1px, 2px)',
  },
];

export const HTML_TAG_RECOMMENDATIONS: SuggestionItem[] = [
  {
    value: 'button',
    label: '<button>',
    category: 'Action',
    description: 'Clickable button element for forms, actions, or checkout',
  },
  {
    value: 'a',
    label: '<a>',
    category: 'Link',
    description: 'Hyperlink to another page, section, or external URL',
  },
  {
    value: 'div',
    label: '<div>',
    category: 'Container',
    description: 'Generic layout container or card wrapper',
  },
  {
    value: 'span',
    label: '<span>',
    category: 'Text',
    description: 'Inline text snippet, badge label, or icon wrapper',
  },
  {
    value: 'h1',
    label: '<h1>',
    category: 'Heading',
    description: 'Primary page hero title (largest heading)',
  },
  {
    value: 'h2',
    label: '<h2>',
    category: 'Heading',
    description: 'Major section heading',
  },
  {
    value: 'h3',
    label: '<h3>',
    category: 'Heading',
    description: 'Card or subsection title',
  },
  {
    value: 'p',
    label: '<p>',
    category: 'Text',
    description: 'Paragraph of readable body text',
  },
  {
    value: 'img',
    label: '<img>',
    category: 'Media',
    description: 'Image graphic, product photo, or logo',
  },
  {
    value: 'input',
    label: '<input>',
    category: 'Form',
    description: 'Form input field (text, search, email, checkbox)',
  },
  {
    value: 'nav',
    label: '<nav>',
    category: 'Navigation',
    description: 'Navigation bar or menu container',
  },
  {
    value: 'header',
    label: '<header>',
    category: 'Layout',
    description: 'Top header bar or banner of page/card',
  },
  {
    value: 'footer',
    label: '<footer>',
    category: 'Layout',
    description: 'Bottom footer area of the page',
  },
  {
    value: 'section',
    label: '<section>',
    category: 'Layout',
    description: 'Thematic content block or page section',
  },
  {
    value: 'ul',
    label: '<ul>',
    category: 'List',
    description: 'Unordered bulleted list container',
  },
  {
    value: 'li',
    label: '<li>',
    category: 'List',
    description: 'Individual list item',
  },
];

/**
 * Returns intelligent value recommendations dynamically tuned
 * to the currently selected CSS property!
 */
export function getPropertyValueRecommendations(property: string): SuggestionItem[] {
  const prop = property.trim().toLowerCase();

  if (prop === 'display') {
    return [
      {
        value: 'none',
        label: 'none',
        category: 'Hide',
        description: 'Hide element completely (removes from visual flow)',
      },
      {
        value: 'block',
        label: 'block',
        category: 'Layout',
        description: 'Standard block-level element taking full available width',
      },
      {
        value: 'inline-block',
        label: 'inline-block',
        category: 'Layout',
        description: 'Inline flow with customizable width, height, and padding',
      },
      {
        value: 'flex',
        label: 'flex',
        category: 'Flexbox',
        description: 'Flexible container for modern row/column layouts',
      },
      {
        value: 'inline-flex',
        label: 'inline-flex',
        category: 'Flexbox',
        description: 'Inline flexible container for buttons with icons',
      },
      {
        value: 'grid',
        label: 'grid',
        category: 'Grid',
        description: 'Multi-column grid container layout',
      },
      {
        value: 'inline',
        label: 'inline',
        category: 'Layout',
        description: 'Flows inside running text without explicit dimensions',
      },
    ];
  }

  if (prop === 'visibility') {
    return [
      {
        value: 'visible',
        label: 'visible',
        category: 'State',
        description: 'Element is shown normally',
      },
      {
        value: 'hidden',
        label: 'hidden',
        category: 'State',
        description: 'Hide element visually while keeping its layout space',
      },
    ];
  }

  if (prop === 'opacity') {
    return [
      { value: '1', label: '1 (100%)', category: 'Opacity', description: 'Fully opaque / solid' },
      { value: '0.9', label: '0.9 (90%)', category: 'Opacity', description: 'Slightly muted' },
      { value: '0.75', label: '0.75 (75%)', category: 'Opacity', description: 'Semi-transparent' },
      { value: '0.5', label: '0.5 (50%)', category: 'Opacity', description: 'Half transparent' },
      { value: '0.25', label: '0.25 (25%)', category: 'Opacity', description: 'Faint / ghosted' },
      { value: '0', label: '0 (0%)', category: 'Opacity', description: 'Completely transparent' },
    ];
  }

  if (prop === 'color' || prop === 'background-color' || prop === 'border-color') {
    return [
      {
        value: '#2563eb',
        label: 'Primary Blue',
        category: 'Brand',
        description: 'Vibrant action blue (#2563eb)',
        previewColor: '#2563eb',
      },
      {
        value: '#10b981',
        label: 'Success Green',
        category: 'Status',
        description: 'Positive emerald green (#10b981)',
        previewColor: '#10b981',
      },
      {
        value: '#ef4444',
        label: 'Alert / Danger Red',
        category: 'Status',
        description: 'Attention crimson red (#ef4444)',
        previewColor: '#ef4444',
      },
      {
        value: '#f59e0b',
        label: 'Warning Amber',
        category: 'Status',
        description: 'Warning gold amber (#f59e0b)',
        previewColor: '#f59e0b',
      },
      {
        value: '#6366f1',
        label: 'Indigo Purple',
        category: 'Accent',
        description: 'Modern indigo purple (#6366f1)',
        previewColor: '#6366f1',
      },
      {
        value: '#0f172a',
        label: 'Dark Slate Navy',
        category: 'Neutral',
        description: 'Deep dark surface background (#0f172a)',
        previewColor: '#0f172a',
      },
      {
        value: '#1e293b',
        label: 'Card Surface Slate',
        category: 'Neutral',
        description: 'Elevated card surface color (#1e293b)',
        previewColor: '#1e293b',
      },
      {
        value: '#64748b',
        label: 'Muted Text Gray',
        category: 'Neutral',
        description: 'Secondary muted label text (#64748b)',
        previewColor: '#64748b',
      },
      {
        value: '#ffffff',
        label: 'Pure White',
        category: 'Neutral',
        description: 'Bright clean white (#ffffff)',
        previewColor: '#ffffff',
      },
      {
        value: '#000000',
        label: 'Pure Black',
        category: 'Neutral',
        description: 'Solid black (#000000)',
        previewColor: '#000000',
      },
      {
        value: 'transparent',
        label: 'transparent',
        category: 'Special',
        description: 'Clear see-through background',
      },
    ];
  }

  if (prop === 'font-size') {
    return [
      { value: '11px', label: '11px', category: 'Tiny', description: 'Badges and captions' },
      { value: '12px', label: '12px', category: 'Small', description: 'Metadata and helper text' },
      { value: '13px', label: '13px', category: 'Standard', description: 'Default UI body text' },
      { value: '14px', label: '14px', category: 'Standard', description: 'Standard readable article text' },
      { value: '16px', label: '16px', category: 'Medium', description: 'Emphasized body / large input' },
      { value: '18px', label: '18px', category: 'Large', description: 'Subheading or modal title' },
      { value: '20px', label: '20px', category: 'Large', description: 'Section title' },
      { value: '24px', label: '24px', category: 'Heading', description: 'Card title or section header' },
      { value: '32px', label: '32px', category: 'Hero', description: 'Primary page hero title' },
    ];
  }

  if (prop === 'font-weight') {
    return [
      { value: 'normal', label: 'normal (400)', category: 'Weight', description: 'Standard regular text' },
      { value: '500', label: '500 (Medium)', category: 'Weight', description: 'Medium weight emphasis' },
      { value: '600', label: '600 (Semi-Bold)', category: 'Weight', description: 'Semi-bold buttons and labels' },
      { value: 'bold', label: 'bold (700)', category: 'Weight', description: 'Strong bold headings' },
      { value: '800', label: '800 (Extra-Bold)', category: 'Weight', description: 'Extra heavy punchy headline' },
    ];
  }

  if (prop === 'text-align') {
    return [
      { value: 'left', label: 'left', category: 'Align', description: 'Left align text (standard)' },
      { value: 'center', label: 'center', category: 'Align', description: 'Center align text' },
      { value: 'right', label: 'right', category: 'Align', description: 'Right align numbers or metadata' },
      { value: 'justify', label: 'justify', category: 'Align', description: 'Full stretch justification' },
    ];
  }

  if (prop === 'border-radius') {
    return [
      { value: '0px', label: '0px (Square)', category: 'Radius', description: 'Sharp crisp corners' },
      { value: '4px', label: '4px (Subtle)', category: 'Radius', description: 'Small rounded corners on inputs' },
      { value: '8px', label: '8px (Standard)', category: 'Radius', description: 'Modern rounded cards and buttons' },
      { value: '12px', label: '12px (Smooth)', category: 'Radius', description: 'Elevated containers and modals' },
      { value: '16px', label: '16px (Puffy)', category: 'Radius', description: 'Extra smooth modern surfaces' },
      { value: '9999px', label: '9999px (Pill)', category: 'Radius', description: 'Fully rounded pill badge or button' },
    ];
  }

  if (prop.startsWith('padding') || prop.startsWith('margin') || prop === 'gap') {
    return [
      { value: '0', label: '0', category: 'Spacing', description: 'Remove all space' },
      { value: '4px', label: '4px', category: 'Spacing', description: 'Tight micro spacing' },
      { value: '8px', label: '8px', category: 'Spacing', description: 'Compact spacing (buttons, chips)' },
      { value: '12px', label: '12px', category: 'Spacing', description: 'Standard comfortable spacing' },
      { value: '16px', label: '16px', category: 'Spacing', description: 'Medium spacing (cards, panels)' },
      { value: '24px', label: '24px', category: 'Spacing', description: 'Spacious section padding' },
      { value: '32px', label: '32px', category: 'Spacing', description: 'Generous layout gutter' },
      { value: '0 auto', label: '0 auto', category: 'Center', description: 'Auto-center block horizontally' },
    ];
  }

  if (prop === 'width' || prop === 'max-width' || prop === 'min-width') {
    return [
      { value: '100%', label: '100%', category: 'Fluid', description: 'Fill entire container width' },
      { value: 'auto', label: 'auto', category: 'Fluid', description: 'Automatic natural content width' },
      { value: 'max-content', label: 'max-content', category: 'Fit', description: 'Fit to largest child element' },
      { value: '320px', label: '320px', category: 'Fixed', description: 'Mobile screen / card width' },
      { value: '480px', label: '480px', category: 'Fixed', description: 'Dialog / card width' },
      { value: '768px', label: '768px', category: 'Container', description: 'Tablet content column' },
      { value: '1200px', label: '1200px', category: 'Container', description: 'Standard desktop page container' },
    ];
  }

  if (prop === 'height' || prop === 'max-height' || prop === 'min-height') {
    return [
      { value: 'auto', label: 'auto', category: 'Fluid', description: 'Natural height based on content' },
      { value: '100%', label: '100%', category: 'Fluid', description: 'Fill full parent height' },
      { value: '32px', label: '32px', category: 'Control', description: 'Standard button / input height' },
      { value: '40px', label: '40px', category: 'Control', description: 'Medium touch target button height' },
      { value: '48px', label: '48px', category: 'Control', description: 'Large comfortable button / bar height' },
      { value: '200px', label: '200px', category: 'Fixed', description: 'Fixed card / image preview height' },
    ];
  }

  if (prop === 'flex-direction') {
    return [
      { value: 'row', label: 'row', category: 'Direction', description: 'Items arranged horizontally left-to-right' },
      { value: 'column', label: 'column', category: 'Direction', description: 'Items stacked vertically top-to-bottom' },
      { value: 'row-reverse', label: 'row-reverse', category: 'Direction', description: 'Items arranged horizontally right-to-left' },
      { value: 'column-reverse', label: 'column-reverse', category: 'Direction', description: 'Items stacked vertically bottom-to-top' },
    ];
  }

  if (prop === 'justify-content') {
    return [
      { value: 'flex-start', label: 'flex-start', category: 'Align', description: 'Align items to start' },
      { value: 'center', label: 'center', category: 'Align', description: 'Center items along axis' },
      { value: 'flex-end', label: 'flex-end', category: 'Align', description: 'Align items to end' },
      { value: 'space-between', label: 'space-between', category: 'Distribute', description: 'Distribute evenly with edges at ends' },
      { value: 'space-around', label: 'space-around', category: 'Distribute', description: 'Distribute evenly with half-space at edges' },
    ];
  }

  if (prop === 'align-items') {
    return [
      { value: 'center', label: 'center', category: 'Align', description: 'Center items vertically across cross-axis' },
      { value: 'flex-start', label: 'flex-start', category: 'Align', description: 'Align items to the top / start' },
      { value: 'flex-end', label: 'flex-end', category: 'Align', description: 'Align items to the bottom / end' },
      { value: 'stretch', label: 'stretch', category: 'Align', description: 'Stretch items to fill container height' },
    ];
  }

  // Fallback defaults
  return [
    { value: 'initial', label: 'initial', category: 'Default', description: 'Reset to browser default value' },
    { value: 'inherit', label: 'inherit', category: 'Default', description: 'Inherit value from parent element' },
    { value: 'unset', label: 'unset', category: 'Default', description: 'Reset or inherit style rule' },
  ];
}
