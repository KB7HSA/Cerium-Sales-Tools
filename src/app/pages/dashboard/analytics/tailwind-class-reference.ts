/**
 * TailwindCSS Class Reference for SEMrush-Style Analytics Dashboard
 * 
 * This file provides a comprehensive breakdown of all TailwindCSS classes
 * used throughout the analytics dashboard components.
 */

export const TAILWIND_CLASS_REFERENCE = {
  
  // ========================================
  // LAYOUT CLASSES
  // ========================================
  
  layout: {
    grid: {
      basic: 'grid grid-cols-1',
      responsive: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
      twoColumn: 'grid grid-cols-1 lg:grid-cols-2',
      threeColumn: 'grid grid-cols-1 lg:grid-cols-3',
      gap: 'gap-4 md:gap-6'
    },
    
    flexbox: {
      row: 'flex items-center',
      between: 'flex items-center justify-between',
      center: 'flex items-center justify-center',
      column: 'flex flex-col',
      wrap: 'flex flex-wrap'
    },
    
    spacing: {
      padding: 'p-6 px-6 py-6',
      margin: 'm-4 mx-auto my-4',
      gap: 'gap-2 gap-3 gap-4 gap-6 gap-8',
      space: 'space-x-3 space-y-3 space-y-6'
    }
  },

  // ========================================
  // COMPONENT STYLES
  // ========================================
  
  components: {
    
    card: {
      base: 'bg-white border border-gray-200 rounded-xl p-6',
      hover: 'hover:shadow-theme-md transition-shadow',
      dark: 'dark:bg-gray-dark dark:border-gray-700',
      complete: 'bg-white border border-gray-200 rounded-xl p-6 hover:shadow-theme-md transition-shadow dark:bg-gray-dark dark:border-gray-700'
    },
    
    button: {
      primary: 'px-6 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
      
      secondary: 'px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
      
      ghost: 'text-sm text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400',
      
      pill: 'px-4 py-1.5 text-xs font-medium rounded-md transition-all',
      
      selected: 'bg-white text-brand-600 shadow-sm dark:bg-gray-700'
    },
    
    input: {
      text: 'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600',
      
      search: 'w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500',
      
      select: 'flex-shrink-0 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500'
    },
    
    badge: {
      default: 'px-3 py-1 rounded-full text-xs font-medium',
      
      blue: 'px-3 py-1 bg-blue-light-50 text-blue-light-700 rounded-full text-xs font-medium dark:bg-blue-light-900/20 dark:text-blue-light-300',
      
      success: 'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full text-success-600 bg-success-50 dark:bg-success-900/20 dark:text-success-300',
      
      error: 'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full text-error-600 bg-error-50',
      
      neutral: 'inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full text-gray-600 bg-gray-50'
    },
    
    dropdown: {
      container: 'absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-theme-lg dark:bg-gray-800 dark:border-gray-700 z-10 max-h-80 overflow-y-auto',
      
      item: 'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between',
      
      itemActive: 'bg-brand-50 text-brand-600'
    }
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================
  
  typography: {
    headings: {
      h1: 'text-2xl font-bold text-gray-900 dark:text-white',
      h2: 'text-xl font-bold text-gray-900 dark:text-white',
      h3: 'text-lg font-semibold text-gray-900 dark:text-white',
      h4: 'text-base font-semibold text-gray-900 dark:text-white'
    },
    
    body: {
      default: 'text-sm text-gray-700 dark:text-gray-300',
      small: 'text-xs text-gray-500 dark:text-gray-400',
      muted: 'text-sm text-gray-500 dark:text-gray-400',
      bold: 'text-sm font-semibold text-gray-900 dark:text-white'
    },
    
    special: {
      metric: 'text-4xl font-bold text-gray-900 dark:text-white',
      uppercase: 'text-xs text-gray-500 uppercase dark:text-gray-400',
      link: 'text-sm text-brand-600 hover:text-brand-700 font-medium dark:text-brand-400'
    }
  },

  // ========================================
  // COLORS
  // ========================================
  
  colors: {
    brand: {
      50: 'bg-brand-50 text-brand-600',
      500: 'bg-brand-500 text-white',
      600: 'bg-brand-600 text-white'
    },
    
    blueLight: {
      50: 'bg-blue-light-50 text-blue-light-700',
      500: 'bg-blue-light-500 text-white'
    },
    
    orange: {
      500: 'bg-orange-500 text-white',
      600: 'bg-orange-600 text-white'
    },
    
    success: {
      50: 'bg-success-50 text-success-700',
      500: 'bg-success-500 text-white',
      600: 'bg-success-600 text-white'
    },
    
    error: {
      50: 'bg-error-50 text-error-700',
      600: 'bg-error-600 text-white'
    },
    
    gray: {
      50: 'bg-gray-50 text-gray-900',
      100: 'bg-gray-100 text-gray-700',
      800: 'bg-gray-800 text-white',
      dark: 'bg-gray-dark text-white'
    }
  },

  // ========================================
  // EFFECTS & ANIMATIONS
  // ========================================
  
  effects: {
    shadows: {
      xs: 'shadow-theme-xs',
      sm: 'shadow-theme-sm',
      md: 'shadow-theme-md',
      lg: 'shadow-theme-lg',
      xl: 'shadow-theme-xl'
    },
    
    transitions: {
      all: 'transition-all',
      colors: 'transition-colors',
      shadow: 'transition-shadow',
      duration: 'duration-300'
    },
    
    hover: {
      shadow: 'hover:shadow-theme-md',
      background: 'hover:bg-gray-50 dark:hover:bg-gray-800',
      scale: 'hover:scale-105',
      opacity: 'hover:opacity-80'
    },
    
    focus: {
      ring: 'focus:outline-none focus:ring-2 focus:ring-brand-500',
      ringOffset: 'focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
    }
  },

  // ========================================
  // BORDERS & RADIUS
  // ========================================
  
  borders: {
    default: 'border border-gray-200 dark:border-gray-700',
    top: 'border-t border-gray-100 dark:border-gray-700',
    bottom: 'border-b border-gray-200 dark:border-gray-700',
    dashed: 'border-2 border-dashed border-gray-300 dark:border-gray-600',
    
    radius: {
      sm: 'rounded',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      full: 'rounded-full'
    }
  },

  // ========================================
  // RESPONSIVE DESIGN
  // ========================================
  
  responsive: {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    
    examples: {
      columns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      spacing: 'gap-4 md:gap-6',
      padding: 'px-4 md:px-6',
      text: 'text-sm md:text-base lg:text-lg'
    }
  },

  // ========================================
  // DARK MODE
  // ========================================
  
  darkMode: {
    backgrounds: {
      page: 'bg-gray-50 dark:bg-gray-900',
      card: 'bg-white dark:bg-gray-dark',
      input: 'bg-white dark:bg-gray-800',
      hover: 'hover:bg-gray-50 dark:hover:bg-gray-800'
    },
    
    text: {
      primary: 'text-gray-900 dark:text-white',
      secondary: 'text-gray-700 dark:text-gray-300',
      muted: 'text-gray-500 dark:text-gray-400'
    },
    
    borders: {
      default: 'border-gray-200 dark:border-gray-700',
      strong: 'border-gray-300 dark:border-gray-600'
    }
  },

  // ========================================
  // STATES
  // ========================================
  
  states: {
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'opacity-60 pointer-events-none',
    active: 'bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-400',
    selected: 'ring-2 ring-brand-500'
  },

  // ========================================
  // UTILITY PATTERNS
  // ========================================
  
  utilities: {
    truncate: 'truncate',
    lineClamp: 'line-clamp-2',
    srOnly: 'sr-only',
    notSrOnly: 'not-sr-only',
    
    positioning: {
      relative: 'relative',
      absolute: 'absolute',
      fixed: 'fixed',
      sticky: 'sticky',
      inset: 'inset-0',
      center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    },
    
    sizing: {
      full: 'w-full h-full',
      screen: 'w-screen h-screen',
      min: 'min-w-0 min-h-0',
      max: 'max-w-full max-h-full'
    }
  }
};

// ========================================
// USAGE EXAMPLES
// ========================================

export const USAGE_EXAMPLES = {
  
  metricCard: `
    <div class="${TAILWIND_CLASS_REFERENCE.components.card.complete}">
      <h3 class="${TAILWIND_CLASS_REFERENCE.typography.headings.h3}">
        Organic Search
      </h3>
      <div class="${TAILWIND_CLASS_REFERENCE.layout.flexbox.row} gap-3">
        <span class="${TAILWIND_CLASS_REFERENCE.typography.special.metric}">
          1.4K
        </span>
        <span class="${TAILWIND_CLASS_REFERENCE.components.badge.success}">
          +22.3%
        </span>
      </div>
    </div>
  `,
  
  searchInput: `
    <input 
      type="text"
      placeholder="Enter domain"
      class="${TAILWIND_CLASS_REFERENCE.components.input.text}"
    />
  `,
  
  primaryButton: `
    <button class="${TAILWIND_CLASS_REFERENCE.components.button.primary}">
      Search
    </button>
  `
};

export default TAILWIND_CLASS_REFERENCE;
