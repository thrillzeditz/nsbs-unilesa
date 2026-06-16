'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Phone, ArrowUpRight, MessageSquareCode } from 'lucide-react';
import { getSettings } from '@/lib/db';
import { SiteSettings } from '@/lib/types';

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Update footer when settings are updated in admin
  useEffect(() => {
    const handleSettingsUpdate = () => {
      getSettings().then(setSettings);
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  const logoNsbs = settings?.logo_nsbs_url || '/logo_nsbs.jpg';
  const logoUnilesa = settings?.logo_unilesa_url || '/logo_unilesa.jpg';
  
  // Format whatsapp deep link
  const whatsappNum = settings?.contact_whatsapp || '2347054083339';
  const whatsappLink = `https://wa.me/${whatsappNum.replace(/[^0-9]/g, '')}?text=Hello%20NSBS%20University%20of%20Ilesa%20Chapter,%20I%20have%20an%20inquiry.`;

  return (
    <footer className="bg-primary text-white border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-white/10">
          
          {/* Section 1: Logo & Org Details */}
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center space-x-4">
              {/* NSBS Logo */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={logoNsbs} 
                  alt="NSBS Logo" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              {/* Unilesa Logo */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={logoUnilesa} 
                  alt="University of Ilesa Logo" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                NSBS University of Ilesa Chapter
              </h3>
              <p className="text-sm text-slate-300 font-medium mt-1">
                Nigerian Society of Biochemistry Students, University of Ilesa Chapter
              </p>
              <p className="text-xs text-slate-400">
                University of Ilesa, Ilesa, Osun State, Nigeria.
              </p>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              {settings?.footer_description || "Official academic and information portal for Biochemistry students. Providing access to learning resources, dues management, announcements, events, and student support."}
            </p>
          </div>

          {/* Section 2: Quick Links */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link href="/library" className="hover:text-secondary hover:underline flex items-center gap-1 transition-premium">
                  Academic Library <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/past-questions" className="hover:text-secondary hover:underline flex items-center gap-1 transition-premium">
                  Past Exam Questions <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/payments" className="hover:text-secondary hover:underline flex items-center gap-1 transition-premium">
                  Departmental Dues <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-secondary hover:underline flex items-center gap-1 transition-premium">
                  News & Announcements <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-secondary hover:underline flex items-center gap-1 transition-premium">
                  Events & E-Voting <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3: Contact Info */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Contact Information
            </h4>
            <ul className="space-y-3.5 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">General Inquiry Email</p>
                  <a href={`mailto:${settings?.contact_email_general || 'nsbsunilesa@gmail.com'}`} className="hover:text-secondary break-all">
                    {settings?.contact_email_general || 'nsbsunilesa@gmail.com'}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageSquareCode className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400">WhatsApp Helpdesk</p>
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-secondary inline-flex items-center gap-1 group"
                  >
                    Chat on WhatsApp
                    <span className="inline-block transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      →
                    </span>
                  </a>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {currentYear} NSBS University of Ilesa Chapter. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Designed for biochemistry academic excellence.
          </p>
        </div>

      </div>
    </footer>
  );
}
