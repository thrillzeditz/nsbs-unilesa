'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, FileText, CreditCard, Newspaper, Calendar, ArrowRight, 
  Target, Eye, ChevronLeft, ChevronRight, GraduationCap, Microscope, Award 
} from 'lucide-react';
import { getSettings, getSocialLinks } from '@/lib/db';
import { SiteSettings, SocialMediaLink } from '@/lib/types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95 1.17 2.27 1.99 3.72 2.27v3.89a10.15 10.15 0 0 1-5.52-2.14v8.19c.02 1.48-.35 2.94-1.07 4.21a9.23 9.23 0 0 1-2.91 3.3c-1.29.85-2.79 1.3-4.33 1.3-1.63.02-3.23-.41-4.6-1.25a9.12 9.12 0 0 1-3.21-3.35C.05 19.34-.14 17.65.12 16c.26-1.64.99-3.17 2.11-4.39A8.99 8.99 0 0 1 8.5 9.07c.88-.04 1.76.06 2.62.3v3.91a5.16 5.16 0 0 0-2.45-.6 5.18 5.18 0 0 0-3.66 1.52 5.25 5.25 0 0 0-1.5 3.73c-.02 1.44.53 2.83 1.53 3.82a5.21 5.21 0 0 0 3.8 1.51 5.25 5.25 0 0 0 3.8-1.5c1-1 1.56-2.38 1.54-3.82V.02h-.62z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface CarouselSlide {
  image: string;
  title: string;
  subtitle: string;
}

const slides: CarouselSlide[] = [
  {
    image: '/carousel_dynamic.png',
    title: 'WE ARE DYNAMIC',
    subtitle: 'Empowering students through innovation, growth, and excellence.'
  },
  {
    image: '/carousel_family.png',
    title: 'WE ARE FAMILY',
    subtitle: 'Building strong bonds and creating a supportive academic community.'
  },
  {
    image: '/carousel_leaders_new.jpg',
    title: 'WE ARE LEADERS',
    subtitle: 'Raising future scientists and impactful professionals.'
  },
  {
    image: '/carousel_excellence.png',
    title: 'WE ARE EXCELLENT',
    subtitle: 'Committed to academic distinction and continuous improvement.'
  },
  {
    image: '/carousel_unity_new.jpg',
    title: 'WE ARE NSBS–UNILESA',
    subtitle: 'One vision. One future. One biochemistry community.'
  }
];

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchData = async () => {
    try {
      const s = await getSettings();
      const sl = await getSocialLinks();
      setSettings(s);
      setSocialLinks(sl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSettingsUpdate = () => {
      fetchData();
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Carousel timer logic
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [loading]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  const logoNsbs = settings?.logo_nsbs_url || '/logo_nsbs.jpg';
  const logoUnilesa = settings?.logo_unilesa_url || '/logo_unilesa.jpg';
  const heroBg = settings?.hero_bg_url || '/hero_bg.jpg';

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <InstagramIcon className="w-6 h-6" />;
      case 'tiktok':
        return <TikTokIcon className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getSocialColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'bg-[#E1306C]/10 text-[#E1306C] border-[#E1306C]/20 hover:bg-[#E1306C]/20';
      case 'tiktok':
        return 'bg-black/10 text-black border-black/20 hover:bg-black/20';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-950">
        {/* Hero Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={heroBg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/20 to-slate-955/90" />
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 mt-6">
          {/* Dual Logos */}
          <div className="flex justify-center items-center gap-6 sm:gap-10">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 p-1.5 shadow-2xl transition-premium hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoNsbs} alt="NSBS Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 p-1.5 shadow-2xl transition-premium hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUnilesa} alt="University of Ilesa Logo" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              {settings?.hero_title || "Welcome to NSBS University of Ilesa Portal"}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              {settings?.hero_description || "Official academic resources, payments portal, and student union affairs portal."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/library" 
              className="w-full sm:w-auto px-8 py-4 bg-secondary hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg shadow-secondary/35 transition-premium flex items-center justify-center gap-2"
            >
              Explore Library <BookOpen className="w-5 h-5" />
            </Link>
            <Link 
              href="/past-questions" 
              className="w-full sm:w-auto px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-bold rounded-full backdrop-blur-md border border-white/20 transition-premium flex items-center justify-center gap-2"
            >
              Past Questions <FileText className="w-5 h-5" />
            </Link>
            <Link 
              href="/payments" 
              className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-amber-600 text-white font-bold rounded-full shadow-lg shadow-accent/35 transition-premium flex items-center justify-center gap-2"
            >
              Pay Departmental Dues <CreditCard className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Curved Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-50 rounded-t-3xl" />
      </section>

      {/* 2. VISION & MISSION SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3.5xl font-extrabold text-primary tracking-tight">
              Our Vision & Mission
            </h2>
            <div className="w-16 h-1 bg-secondary mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Vision */}
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-lg border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-premium">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-110 transition-premium" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-primary">Vision Statement</h3>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {settings?.vision_statement || "To build a vibrant academic community of biochemistry students equipped with research skills, academic excellence, and ethical leadership."}
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-lg border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-premium">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-50 rounded-full group-hover:scale-110 transition-premium" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-primary">Mission Statement</h3>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {settings?.mission_statement || "To provide quality study materials, maintain transparent financial reporting, promote student welfare, and foster research collaborations."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NEW IMAGE SLIDER SECTION (CAROUSEL) */}
      <section className="relative w-full bg-slate-950 overflow-hidden border-y border-slate-900">
        <div className="relative w-full h-[85vh] lg:h-[90vh] group">
          {/* Slides */}
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover transition-transform duration-10000 ease-linear scale-100 group-hover:scale-[1.03]"
              />
              {/* Gradients Overlay for text readability and cinematic look */}
              <div className="absolute inset-0 bg-slate-950/45" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/50" />
              
              {/* Slide Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 lg:p-8 text-white space-y-3 sm:space-y-4">
                <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-wider text-white animate-fade-in uppercase">
                  {slide.title}
                </h3>
                <p className="text-sm sm:text-lg lg:text-xl font-light text-slate-200 max-w-2xl leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-305 cursor-pointer ${
                  idx === currentSlide ? 'bg-secondary w-7' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. EMPOWERING JOURNEY SECTION (Student Opportunities, Academic Support, Research & Innovation) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3.5xl font-extrabold text-primary tracking-tight">
              Empowering Your Biochemistry Journey
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2">
              Discover programs, pipelines, and frameworks custom-built for biochemistry students at UNILESA.
            </p>
            <div className="w-16 h-1 bg-secondary mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Opportunities */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-slate-300 transition-premium group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-primary group-hover:text-secondary transition-colors">
                    Student Opportunities
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Take your learning beyond the lecture hall. Discover industrial training resources (SIWES placements), professional networks, and skill acquisition symposia.
                  </p>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 text-sm">✓</span> SIWES Placement Directory
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 text-sm">✓</span> Annual Biochemistry Symposia
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 text-sm">✓</span> Professional Networks & Chapters
                  </li>
                </ul>
              </div>
            </div>

            {/* Academic Support */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-slate-300 transition-premium group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-primary group-hover:text-secondary transition-colors">
                    Academic Support
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Achieve excellence in coursework and assessments. Utilize peer study groups, departmental guidelines, and detailed study notes designed for first-class preparation.
                  </p>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm">✓</span> Structured Course Notes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm">✓</span> Peer-led Tutorial Guides
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm">✓</span> GPA & CGPA Advising Guides
                  </li>
                </ul>
              </div>
            </div>

            {/* Research & Innovation */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-slate-300 transition-premium group">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <Microscope className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-primary group-hover:text-secondary transition-colors">
                    Research & Innovation
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ignite your scientific curiosity. Connect with lab study tools, simulation techniques, biochemical databases, and guides for undergraduate project research.
                  </p>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="text-sky-500 text-sm">✓</span> Laboratory Practical Manuals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-sky-500 text-sm">✓</span> Bioinformatics & Data Outlines
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-sky-500 text-sm">✓</span> Project Formatting Outlines
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FANCY QUICK ACCESS CTAs (LIBRARY & PAST QUESTIONS) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3.5xl font-extrabold text-primary tracking-tight">
              Access the Portals
            </h2>
            <div className="w-16 h-1 bg-secondary mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Library CTA Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-10 hover:shadow-2xl hover:bg-white hover:border-slate-300 transition-premium group flex flex-col justify-between h-[360px] sm:h-[320px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50/50 rounded-full blur-2xl group-hover:bg-emerald-100/50 transition-premium" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Digital Study Vault
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 shadow-sm transition-premium group-hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/portal_library.png" alt="Library Portal" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary">
                  Unlock the Vault of Knowledge
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-light">
                  Deep-dive into structured biochemistry lecture outlines, reference booklets, and general guides. Carefully organized by study level, semester, and course folders to make finding materials seamless.
                </p>
              </div>
              <div className="pt-6 relative z-10">
                <Link 
                  href="/library" 
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-md transition-premium cursor-pointer"
                >
                  Go to Library <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Past Questions CTA Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-10 hover:shadow-2xl hover:bg-white hover:border-slate-300 transition-premium group flex flex-col justify-between h-[360px] sm:h-[320px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-50/50 rounded-full blur-2xl group-hover:bg-amber-100/50 transition-premium" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Exam Bank
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 shadow-sm transition-premium group-hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/portal_pastqs.png" alt="Past Questions Portal" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary">
                  Accelerate Your Exam Preparation
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-light">
                  Practice with real questions. Access our comprehensive repository of past exam papers and assessment sheets. Train yourself under pressure to test your readiness and boost your grades.
                </p>
              </div>
              <div className="pt-6 relative z-10">
                <Link 
                  href="/past-questions" 
                  className="inline-flex items-center gap-1.5 px-6 py-3 bg-accent hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-premium cursor-pointer"
                >
                  Search Past Questions <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. SOCIAL MEDIA UPDATES SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-secondary font-bold text-xs uppercase tracking-wider">Social Channels</p>
            <h2 className="text-2xl sm:text-3.5xl font-extrabold text-primary tracking-tight mt-1">
              Catch Up On Latest News, Updates & Activities
            </h2>
            <div className="w-16 h-1 bg-secondary mx-auto mt-3 rounded-full" />
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-6 max-w-2xl mx-auto w-full">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 w-full max-w-xs rounded-2xl p-6 border flex flex-col items-center text-center justify-between space-y-4 transition-premium shadow-sm hover:scale-[1.02] ${getSocialColor(link.platform)}`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 rounded-full bg-white shadow-sm shrink-0">
                    {getSocialIcon(link.platform)}
                  </div>
                  <div>
                    <h3 className="font-bold capitalize text-lg text-slate-800">
                      {link.platform}
                    </h3>
                    <p className="text-xs font-medium opacity-80 mt-0.5">
                      @{link.username}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold underline opacity-90 group-hover:opacity-100 pt-2">
                  View Feed &rarr;
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
