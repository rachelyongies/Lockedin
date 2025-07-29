'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { ErrorBoundary } from 'react-error-boundary';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/helpers';
import { Header } from '../Header';
import { useWalletStore } from '@/store/useWalletStore';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

// Background animation variants for DeFi ambiance
const backgroundVariants = {
  initial: {
    background: 'radial-gradient(ellipse at top, rgba(102, 126, 234, 0.05) 0%, transparent 50%)',
  },
  animate: {
    background: [
      'radial-gradient(ellipse at top, rgba(102, 126, 234, 0.05) 0%, transparent 50%)',
      'radial-gradient(ellipse at bottom right, rgba(118, 75, 162, 0.05) 0%, transparent 50%)',
      'radial-gradient(ellipse at top left, rgba(102, 126, 234, 0.05) 0%, transparent 50%)',
    ],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background-dark">
    <div className="max-w-md mx-auto text-center px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-error" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Something went wrong
      </h2>
      <p className="text-text-tertiary mb-6">
        {error.message || 'An unexpected error occurred while loading this page'}
      </p>
      <div className="space-y-3">
        <button
          onClick={resetErrorBoundary}
          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full px-4 py-2 bg-background-tertiary text-text-secondary rounded-lg hover:bg-background-secondary transition-colors"
        >
          Go to Bridge
        </button>
      </div>
    </div>
  </div>
);

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  // Page metadata
  title?: string;
  description?: string;
  keywords?: string;
  // Layout options
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  centered?: boolean;
  // Page header
  pageHeader?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  // Animation options
  animate?: boolean;
  animationKey?: string; // For triggering new animations on route changes
  // Background options
  backgroundAnimation?: boolean;
  overlay?: boolean;
  // Error boundary
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  // Accessibility
  announcePageChange?: boolean;
}

export const PageWrapper = React.forwardRef<HTMLDivElement, PageWrapperProps>(
  (
    {
      children,
      className,
      title,
      description,
      keywords,
      maxWidth = 'xl',
      padding = 'lg',
      centered = false,
      pageHeader,
      breadcrumbs,
      animate = true,
      animationKey,
      backgroundAnimation = true,
      overlay = true,
      errorFallback = DefaultErrorFallback,
      onError,
      announcePageChange = true,
      ...props
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(title);
    
    // Wallet store for Header actions
    const { connect, disconnect } = useWalletStore();

    // Handle SSR/hydration
    useEffect(() => {
      setMounted(true);
    }, []);

    // Update title for announcements
    useEffect(() => {
      if (title && title !== currentTitle) {
        setCurrentTitle(title);
      }
    }, [title, currentTitle]);

    // Container styles
    const containerClasses = {
      sm: 'max-w-sm',
      md: 'max-w-3xl',
      lg: 'max-w-5xl',
      xl: 'max-w-7xl',
      '2xl': 'max-w-8xl',
      full: 'max-w-none',
    };

    const paddingClasses = {
      none: '',
      sm: 'px-4 py-6',
      md: 'px-6 py-8',
      lg: 'px-4 sm:px-6 lg:px-8 py-8 lg:py-12',
    };

    // Build page title
    const pageTitle = title ? `${title} | UniteDefi Bridge` : 'UniteDefi Bridge - ETH ⟷ BTC';

    return (
      <ErrorBoundary
        FallbackComponent={errorFallback}
        onError={onError}
        onReset={() => {
          // Optional: Add analytics or logging here
          console.log('Page error boundary reset');
        }}
      >
        {/* Head management for SEO */}
        <Head>
          <title>{pageTitle}</title>
          {description && <meta name="description" content={description} />}
          {keywords && <meta name="keywords" content={keywords} />}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta property="og:title" content={pageTitle} />
          {description && <meta property="og:description" content={description} />}
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={pageTitle} />
          {description && <meta name="twitter:description" content={description} />}
        </Head>

        <div className="min-h-screen bg-background-dark text-text-primary overflow-x-hidden">
          {/* Accessibility: Live region for page announcements */}
          {announcePageChange && currentTitle && (
            <div aria-live="polite" className="sr-only">
              {currentTitle} page loaded
            </div>
          )}

          {/* Animated Background */}
          {backgroundAnimation && mounted && (
            <motion.div
              className="fixed inset-0 pointer-events-none"
              variants={backgroundVariants}
              initial="initial"
              animate="animate"
              style={{ zIndex: 0 }}
            />
          )}

          {/* Overlay Pattern */}
          {overlay && (
            <div 
              className="fixed inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)
                `,
                backgroundSize: '20px 20px',
                zIndex: 1,
              }}
            />
          )}

          {/* Header */}
          <Header 
            className="relative z-30" 
            walletActions={{
              connect: async () => {
                // For now, just log - the actual connection is handled by WalletConnector
                console.log('Connect action triggered from Header');
              },
              disconnect: async () => {
                console.log('🔥 Header disconnect button clicked - calling wallet store disconnect');
                await disconnect();
              }
            }}
          />

          {/* Main Content */}
          <motion.main
            ref={ref}
            className={cn(
              'relative z-20',
              centered && 'flex items-center justify-center min-h-[calc(100vh-4rem)]',
              className
            )}
            {...props}
          >
            <div className={cn(
              'mx-auto w-full',
              containerClasses[maxWidth],
              paddingClasses[padding]
            )}>
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="mb-6">
                  <ol className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <svg
                            className="w-4 h-4 mx-2 text-text-tertiary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {crumb.href ? (
                          <a
                            href={crumb.href}
                            className="text-text-tertiary hover:text-primary-400 transition-colors"
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span className="text-text-secondary font-medium">
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Page Header */}
              {pageHeader && (
                <div className="mb-8">
                  {pageHeader}
                </div>
              )}

              {/* Page Content */}
              <AnimatePresence mode="wait">
                {animate ? (
                  <motion.div
                    key={animationKey || 'page-content'}
                    variants={pageVariants}
                    initial="initial"
                    animate="in"
                    exit="out"
                    className="w-full"
                  >
                    {children}
                  </motion.div>
                ) : (
                  <div key={animationKey || 'page-content'} className="w-full">
                    {children}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>

          {/* Floating Elements Portal */}
          <div id="portal-root" className="relative z-50" />
        </div>
      </ErrorBoundary>
    );
  }
);

PageWrapper.displayName = 'PageWrapper';

// Specialized page wrappers for common layouts
export const BridgePageWrapper = React.forwardRef<HTMLDivElement, 
  Omit<PageWrapperProps, 'maxWidth' | 'centered'>
>(({ children, ...props }, ref) => (
  <PageWrapper
    ref={ref}
    maxWidth="lg"
    centered
    title="Bridge"
    description="Seamlessly bridge between Bitcoin and Ethereum networks"
    keywords="bitcoin, ethereum, bridge, defi, crypto, swap"
    breadcrumbs={[{ label: 'Bridge' }]}
    {...props}
  >
    {children}
  </PageWrapper>
));

BridgePageWrapper.displayName = 'BridgePageWrapper';

export const TransactionsPageWrapper = React.forwardRef<HTMLDivElement, 
  Omit<PageWrapperProps, 'maxWidth'>
>(({ children, ...props }, ref) => (
  <PageWrapper
    ref={ref}
    maxWidth="2xl"
    title="Transactions"
    description="View and track your bridge transaction history"
    keywords="transactions, history, bridge, bitcoin, ethereum"
    breadcrumbs={[
      { label: 'Bridge', href: '/' },
      { label: 'Transactions' }
    ]}
    pageHeader={
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Transaction History
        </h1>
        <p className="text-text-tertiary">
          Track your bridge transactions and their status
        </p>
      </div>
    }
    {...props}
  >
    {children}
  </PageWrapper>
));

TransactionsPageWrapper.displayName = 'TransactionsPageWrapper';

export const DocsPageWrapper = React.forwardRef<HTMLDivElement, 
  Omit<PageWrapperProps, 'maxWidth' | 'backgroundAnimation'>
>(({ children, ...props }, ref) => (
  <PageWrapper
    ref={ref}
    maxWidth="xl"
    backgroundAnimation={false}
    title="Documentation"
    description="Learn how to use the UniteDefi Bridge"
    keywords="documentation, guide, tutorial, bridge, help"
    breadcrumbs={[
      { label: 'Bridge', href: '/' },
      { label: 'Documentation' }
    ]}
    pageHeader={
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Documentation
        </h1>
        <p className="text-lg text-text-secondary">
          Everything you need to know about bridging between Bitcoin and Ethereum
        </p>
      </div>
    }
    {...props}
  >
    {children}
  </PageWrapper>
));

DocsPageWrapper.displayName = 'DocsPageWrapper';

// Loading wrapper for Suspense boundaries
export const LoadingPageWrapper = React.forwardRef<HTMLDivElement, {
  title?: string;
  message?: string;
}>(({ title = "Loading", message = "Please wait..." }, ref) => (
  <PageWrapper ref={ref} centered animate={false} announcePageChange={false}>
    <div className="text-center">
      <motion.div
        className="w-12 h-12 mx-auto mb-4 border-2 border-primary-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h2>
      <p className="text-text-tertiary">
        {message}
      </p>
    </div>
  </PageWrapper>
));

LoadingPageWrapper.displayName = 'LoadingPageWrapper';

export { PageWrapper as default };