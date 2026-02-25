import React from 'react';
import { ChevronRight } from 'lucide-react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
};

const NextButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ loading = false, loadingText = 'Loading...', children = 'Next', className = '', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        aria-label={rest['aria-label'] ?? (loading ? 'Loading, please wait' : 'Next')}
        aria-busy={loading}
        className={
          className ||
          'flex items-center justify-center gap-2 px-4 py-2 w-full bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
        }
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            {children} <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    );
  }
);

NextButton.displayName = 'NextButton';

export default NextButton;
