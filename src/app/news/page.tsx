'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Newspaper, Search, Calendar, User, Tag, ChevronRight, BookOpen } from 'lucide-react';
import { getNewsArticles } from '@/lib/db';
import { NewsArticle } from '@/lib/types';

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    'Departmental Announcements',
    'Academic Updates',
    'Scholarships',
    'Research Opportunities',
    'Student Achievements',
    'General News'
  ];

  useEffect(() => {
    getNewsArticles().then(data => {
      setArticles(data);
      setLoading(false);
    });
  }, []);

  // Filtering
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' || 
                          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary text-sm font-bold uppercase tracking-wider">
            <Newspaper className="w-4 h-4" /> Editorial Hub
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-1">
            NSBS News & Announcements
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Stay informed with the latest updates, scholarships, academic events, and student milestones within the Nigerian Society of Biochemistry Students, University of Ilesa Chapter.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Categories, Right Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Categories List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Blog Categories
            </h3>
            <div className="flex flex-col gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-premium border ${
                    selectedCategory === cat
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Search & Posts */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search news title, topic, contents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-sm shadow-sm"
            />
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary"></div>
              <p className="text-xs text-slate-400 mt-3">Loading news articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Newspaper className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-base">No Articles Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No blog posts matched your search keyword or selected category.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-premium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* News Grid List */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-premium overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Featured Image */}
                    <div className="h-48 relative overflow-hidden bg-slate-100 border-b border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.featured_image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-premium duration-500"
                      />
                      <div className="absolute bottom-4 left-4">
                        <span className="text-[10px] font-extrabold bg-primary text-white border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Title */}
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3.5 text-[10px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-secondary" />
                          {new Date(article.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <User className="w-3.5 h-3.5 text-secondary" />
                          {article.author}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-base group-hover:text-secondary transition-colors line-clamp-2 leading-tight">
                        {article.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {article.content}
                      </p>
                    </div>
                  </div>

                  {/* Read More button footer */}
                  <div className="px-6 pb-6 pt-3 mt-auto flex items-center justify-between border-t border-slate-50">
                    {article.tags && article.tags.length > 0 ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none pr-4">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[9px] font-bold text-slate-500">
                          {article.tags.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}
                    <Link
                      href={`/news/${article.slug}`}
                      className="px-3.5 py-1.5 bg-slate-50 group-hover:bg-primary border border-slate-200 group-hover:border-primary text-slate-700 group-hover:text-white font-bold text-xs rounded-xl transition-premium flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      Read Full <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
