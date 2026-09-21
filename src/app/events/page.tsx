'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { getEvents } from '@/lib/db';
import { ActivityEvent } from '@/lib/types';
import ElectionPortal from '@/components/ElectionPortal';

export default function EventsPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const evs = await getEvents();
      setEvents(evs);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Split events into upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now);
  const pastEvents = events.filter(e => new Date(e.date) < now);

  return (
    <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-secondary text-sm font-bold uppercase tracking-wider">
          <Calendar className="w-4 h-4" /> Student Activities & Democracy
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-1">
          Events & E-Voting Hub
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Stay updated on student chapter events and exercise your democratic rights in elections securely.
        </p>
      </div>

      {/* Main Grid: Left Events Listing, Right Election Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Events Listing */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Upcoming Events */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-5 h-5 text-secondary" /> Upcoming Activities
            </h3>

            {loading ? (
              <div className="py-10 text-center animate-pulse text-slate-400 text-xs">Loading events...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                No upcoming events scheduled at the moment. Check back soon!
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingEvents.map(event => (
                  <div 
                    key={event.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:border-slate-300 transition-premium group"
                  >
                    {/* Poster */}
                    <div className="h-44 relative bg-slate-100 shrink-0 border-b border-slate-150">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={event.poster_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-premium duration-500" 
                      />
                    </div>
                    {/* Details */}
                    <div className="p-5 flex flex-col justify-between space-y-3.5 flex-grow">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-extrabold text-white bg-secondary px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Upcoming Event
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug pt-1">
                          {event.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-secondary shrink-0" />
                          <span>{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-secondary shrink-0" />
                          <span className="truncate max-w-[250px]">{event.venue}</span>
                        </div>
                      </div>

                      {event.registration_link && (
                        <a
                          href={event.registration_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit px-4 py-2 bg-primary hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm transition-premium flex items-center gap-1"
                        >
                          Register Now <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          <div className="space-y-4 pt-2">
            <h3 className="font-extrabold text-slate-600 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4.5 h-4.5 text-slate-400" /> Past Events & Archive
            </h3>

            {loading ? null : pastEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
                No past event records archived yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pastEvents.map(event => (
                  <div 
                    key={event.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm opacity-85 hover:opacity-100 transition-premium"
                  >
                    <div className="h-28 bg-slate-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover filter grayscale" />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1">{event.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">{event.description}</p>
                      <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                        Held on {new Date(event.date).toLocaleDateString()} &bull; {event.venue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Upgraded NSBS E-Voting Portal */}
        <div className="lg:col-span-7 space-y-6">
          <ElectionPortal />
        </div>

      </div>

    </div>
  );
}
