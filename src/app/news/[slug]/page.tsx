'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, User, Tag, ArrowLeft, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { getNewsArticles, getComments, addComment } from '@/lib/db';
import { NewsArticle, Comment } from '@/lib/types';
import Link from 'next/link';

export default function ArticleDetail() {
  const { slug } = useParams();
  const router = useRouter();

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Comment state
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const fetchArticleAndComments = async () => {
    try {
      const allArticles = await getNewsArticles();
      const current = allArticles.find(a => a.slug === slug);
      if (current) {
        setArticle(current);
        const allComments = await getComments(current.id);
        setComments(allComments.filter(c => c.is_approved)); // Only show approved ones
      }
    } catch (err) {
      console.error("Error loading article detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchArticleAndComments();
    }
  }, [slug]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentEmail || !commentContent || !article) {
      alert("Please fill in all comment form fields.");
      return;
    }

    setCommentSubmitting(true);
    try {
      await addComment({
        article_id: article.id,
        name: commentName,
        email: commentEmail,
        content: commentContent,
      });

      setCommentSuccess(true);
      setCommentContent('');
      
      // Reset success message after 4s
      setTimeout(() => {
        setCommentSuccess(false);
      }, 4000);

    } catch (err) {
      console.error(err);
      alert("Failed to submit comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex-grow max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Article Not Found</h2>
        <p className="text-sm text-slate-500">
          The news post you are looking for does not exist or has been deleted by an administrator.
        </p>
        <Link href="/news" className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm">
          Return to News Listing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back to news button */}
      <div>
        <button
          onClick={() => router.push('/news')}
          className="px-4 py-2 border border-slate-200 rounded-xl hover:border-slate-300 text-slate-600 hover:text-primary font-bold text-xs flex items-center gap-1.5 transition-premium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to News Listing
        </button>
      </div>

      {/* Main Article Card */}
      <article className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Featured Image */}
        <div className="h-64 sm:h-[400px] w-full relative bg-slate-100 border-b border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.featured_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Box */}
        <div className="p-6 sm:p-10 space-y-6">
          
          {/* Category Badge & Metadata */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="text-[10px] font-extrabold bg-secondary text-white px-3 py-1 rounded-full uppercase tracking-wider">
              {article.category}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-secondary" />
                {new Date(article.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-secondary" />
                {article.author}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary leading-snug tracking-tight">
            {article.title}
          </h1>

          {/* Content Body */}
          <div className="text-slate-700 leading-relaxed text-sm sm:text-base space-y-4 whitespace-pre-wrap pt-4 border-t border-slate-100">
            {article.content}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-6 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Tags:
              </span>
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

        </div>

      </article>

      {/* COMMENTS COMPONENT */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Comments List */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-secondary" /> Approved Comments ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl text-xs leading-relaxed">
              No comments have been posted yet, or they are currently awaiting moderation. Be the first to express your thoughts!
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
              {comments.map((comm) => (
                <div key={comm.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary">{comm.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(comm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {comm.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Post a Comment Form */}
        <div className="md:col-span-6 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          <div className="space-y-1">
            <h3 className="font-extrabold text-white text-lg">Leave a Comment</h3>
            <p className="text-slate-400 text-xs leading-normal">
              Your email address will not be published. Required fields are marked *
            </p>
          </div>

          {commentSuccess ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-slate-200 space-y-2.5">
              <CheckCircle2 className="w-10 h-10 text-secondary mx-auto animate-bounce" />
              <h4 className="font-bold text-sm">Comment Submitted!</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Thank you for contributing! Your comment is queued for administrator moderation and will be visible publicly once approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCommentSubmit} className="space-y-4 text-slate-800">
              
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Name *</label>
                  <input
                    type="text"
                    required
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="e.g. Akinola Segun"
                    className="block w-full px-3.5 py-2 border border-slate-700 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="segun@student.unilesa.edu.ng"
                    className="block w-full px-3.5 py-2 border border-slate-700 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-xs"
                  />
                </div>
              </div>

              {/* Comment Content */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Comment *</label>
                <textarea
                  required
                  rows={4}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Type your comment here..."
                  className="block w-full px-3.5 py-2.5 border border-slate-700 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={commentSubmitting}
                className="w-full py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                {commentSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Comment</span>
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </section>

    </div>
  );
}
