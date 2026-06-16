'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BookOpen, CreditCard, Newspaper, Calendar, Shield, Award } from 'lucide-react';
import { getSettings } from '@/lib/db';
import { SiteSettings } from '@/lib/types';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Fetch settings on mount
    getSettings().then(setSettings);

    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update header settings when admin changes it
  useEffect(() => {
    const handleSettingsUpdate = () => {
      getSettings().then(setSettings);
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Library', href: '/library', icon: BookOpen },
    { name: 'Past Questions', href: '/past-questions', icon: BookOpen },
    { name: 'Dues Payment', href: '/payments', icon: CreditCard },
    { name: 'News & Updates', href: '/news', icon: Newspaper },
    { name: 'Events & Voting', href: '/events', icon: Calendar },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const logoUrl = settings?.logo_nsbs_url || '/logo_nsbs.jpg';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-premium ${scrolled ? 'glass shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 bg-primary flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={logoUrl} 
                alt="NSBS Logo" 
                className="w-full h-full object-cover group-hover:scale-110 transition-premium" 
              />
            </div>
            <div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-primary">
                NSBS-UNILESA
              </span>
              <div className="hidden sm:block text-[9px] text-muted-foreground font-semibold uppercase tracking-wider leading-tight">
                <div>Nigerian Society of Biochemistry Students</div>
                <div className="text-[8px] text-slate-400 font-medium">University of Ilesa Chapter</div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-premium ${
                    active 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-primary/80 hover:bg-slate-100 hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-premium ${
                isActive('/admin')
                  ? 'bg-primary text-white shadow-md'
                  : 'text-primary/80 hover:bg-slate-100 hover:text-primary'
              }`}
            >
              <Shield className="w-4 h-4" />
              Portal Admin
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:text-primary hover:bg-slate-100 transition-premium focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden transition-premium duration-300 overflow-hidden ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="glass px-4 pt-2 pb-6 space-y-1.5 border-t border-border mt-3 shadow-lg">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-premium ${
                  active 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-primary/80 hover:bg-slate-100 hover:text-primary'
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {link.name}
              </Link>
            );
          })}
          <div className="border-t border-slate-200/60 pt-2 mt-2">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-premium ${
                isActive('/admin')
                  ? 'bg-primary text-white shadow-md'
                  : 'text-primary/80 hover:bg-slate-100 hover:text-primary'
              }`}
            >
              <Shield className="w-5 h-5" />
              Portal Admin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
