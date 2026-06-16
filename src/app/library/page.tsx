'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Folder, File, Download, BookOpen, ChevronRight, 
  ChevronLeft, AlertCircle, FileText, FolderOpen, BookOpenCheck 
} from 'lucide-react';
import { getLibraryResources, getPastQuestions } from '@/lib/db';
import { LibraryResource, PastQuestion } from '@/lib/types';
import Link from 'next/link';

export default function Library() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [pastQuestions, setPastQuestions] = useState<PastQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation States
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourseFolder, setSelectedCourseFolder] = useState<string | null>(null);
  
  // Search state inside course folder
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getLibraryResources();
        const pqs = await getPastQuestions();
        setResources(res);
        setPastQuestions(pqs);
      } catch (err) {
        console.error("Error fetching library data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = (id: string, fileUrl: string, title: string) => {
    setDownloadingId(id);
    
    setTimeout(() => {
      setDownloadingId(null);
      if (fileUrl === '#' || !fileUrl) {
        alert(`Virtual Download Started for:\n"${title}"\n\n(This file was loaded from mock local storage.)`);
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        if (fileUrl.startsWith('http')) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        } else {
          link.setAttribute('download', title);
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, 1200);
  };

  // Convert past questions to look like general library resource items
  const mappedPastQuestions = pastQuestions.map(pq => ({
    id: pq.id,
    title: pq.title,
    description: `Official past question paper for academic session ${pq.academic_session}.`,
    course_code: pq.course_code,
    level: pq.level,
    semester: pq.semester,
    file_url: pq.file_url,
    file_type: 'PDF',
    file_size: '1.2 MB',
    created_at: pq.created_at,
    isPastQuestion: true
  }));

  const allMaterials = [...resources, ...mappedPastQuestions];

  // Unique levels
  const levels = [
    { key: '100', label: '100 Level', desc: 'First-year introductory courses' },
    { key: '200', label: '200 Level', desc: 'Basic biochemistry foundational courses' },
    { key: '300', label: '300 Level', desc: 'Intermediate lectures & lab modules' },
    { key: '400', label: '400 Level', desc: 'Advanced coursework & seminars' },
    { key: 'misc', label: 'Miscellaneous', desc: 'General study materials, handbook guidelines, and career resources' },
  ];

  // Semesters
  const semesters = [
    { key: 'First', label: 'First Semester', desc: 'Harmattan semester lecture materials' },
    { key: 'Second', label: 'Second Semester', desc: 'Rain semester lecture materials' },
  ];

  // Helper count routines
  const getLevelCount = (lvl: string) => {
    return allMaterials.filter(item => item.level === lvl).length;
  };

  const getSemesterCount = (lvl: string, sem: string) => {
    return allMaterials.filter(item => item.level === lvl && item.semester === sem).length;
  };

  // Unique course codes in selected level & semester
  const DEFAULT_COURSE_FOLDERS: Record<string, Record<string, string[]>> = {
    '100': {
      'First': ['MTH 101', 'COS 101', 'PHY 101', 'CHM 101', 'BIO 101', 'GST 111', 'LIS 199', 'FRN 199'],
      'Second': ['MTH 102', 'COS 102', 'PHY 102', 'CHM 102', 'BIO 102', 'GST 112', 'EMT 192']
    },
    '200': {
      'First': [
        'ENT 211', 'BCH 201', 'STA 203', 'UNILESA-BIO 201', 
        'UNILESA-CHM 291', 'UNILESA-MCS 291', 'UNILESA-BIO 203', 'UNILESA-GSE 297'
      ],
      'Second': [
        'GST 212', 'BCH 202', 'UNILESA-BIO 294', 'UNILESA-CHM 290', 
        'UNILESA-CHM 292', 'UNILESA-BCH 294', 'UNILESA-BCH 296', 
        'UNILESA-BCH 298', 'UNILESA-BIO 292', 'UNILESA-GSE 298'
      ]
    },
    '300': {
      'First': ['MCB 309', 'BCH 303', 'BCH 305', 'BCH 307', 'UNILESA BCH 393', 'BCH 309', 'UNILESA BCH 395', 'BCH 301'],
      'Second': ['CHM 396', 'BCH 302', 'BCH 394', 'BCH 304', 'GST 312', 'BCH 306', 'BCH 308', 'BCH 390', 'ENT 312']
    }
  };

  const getCoursesInSemester = () => {
    if (!selectedLevel || !selectedSemester) return [];
    const filtered = allMaterials.filter(
      item => item.level === selectedLevel && item.semester === selectedSemester
    );
    const dynamicCodes = filtered.map(item => item.course_code.trim().toUpperCase());
    const staticCodes = DEFAULT_COURSE_FOLDERS[selectedLevel]?.[selectedSemester] || [];
    const codes = Array.from(new Set([...staticCodes, ...dynamicCodes]));
    return codes.sort();
  };

  const courses = getCoursesInSemester();

  const getCourseCount = (courseCode: string) => {
    return allMaterials.filter(
      item => item.level === selectedLevel && 
              item.semester === selectedSemester && 
              item.course_code.trim().toUpperCase() === courseCode
    ).length;
  };

  // Files list for selected folder view
  const getFilesInFolder = () => {
    if (!selectedLevel) return [];
    
    if (selectedLevel === 'misc') {
      const files = allMaterials.filter(item => item.level === 'misc');
      if (searchQuery.trim() === '') return files;
      const lowerQuery = searchQuery.toLowerCase();
      return files.filter(
        f => f.title.toLowerCase().includes(lowerQuery) || 
             f.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    if (!selectedSemester || !selectedCourseFolder) return [];
    
    const files = allMaterials.filter(
      item => item.level === selectedLevel && 
              item.semester === selectedSemester && 
              item.course_code.trim().toUpperCase() === selectedCourseFolder
    );

    if (searchQuery.trim() === '') return files;

    const lowerQuery = searchQuery.toLowerCase();
    return files.filter(
      f => f.title.toLowerCase().includes(lowerQuery) || 
           f.description.toLowerCase().includes(lowerQuery)
    );
  };

  const filesInFolder = getFilesInFolder();

  // Navigation handlers
  const handleLevelSelect = (lvl: string) => {
    setSelectedLevel(lvl);
    setSelectedSemester(null);
    setSelectedCourseFolder(null);
    setSearchQuery('');
  };

  const handleSemesterSelect = (sem: string) => {
    setSelectedSemester(sem);
    setSelectedCourseFolder(null);
    setSearchQuery('');
  };

  const handleCourseSelect = (course: string) => {
    setSelectedCourseFolder(course);
    setSearchQuery('');
  };

  const handleReset = () => {
    setSelectedLevel(null);
    setSelectedSemester(null);
    setSelectedCourseFolder(null);
    setSearchQuery('');
  };

  // Breadcrumbs builder
  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-55 border border-slate-200 px-4 py-3 rounded-2xl shadow-sm overflow-x-auto whitespace-nowrap">
        <button
          onClick={handleReset}
          className="hover:text-secondary transition-colors font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" /> Academic Library
        </button>
        
        {selectedLevel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                setSelectedSemester(null);
                setSelectedCourseFolder(null);
                setSearchQuery('');
              }}
              className="hover:text-secondary transition-colors font-bold text-slate-600 cursor-pointer"
            >
              {selectedLevel === 'misc' ? 'Miscellaneous' : `${selectedLevel} Level`}
            </button>
          </>
        )}

        {selectedSemester && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                setSelectedCourseFolder(null);
                setSearchQuery('');
              }}
              className="hover:text-secondary transition-colors font-bold text-slate-600 cursor-pointer"
            >
              {selectedSemester} Semester
            </button>
          </>
        )}

        {selectedCourseFolder && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-secondary font-extrabold bg-secondary/10 px-2 py-0.5 rounded">
              {selectedCourseFolder} Folder
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary text-sm font-bold uppercase tracking-wider">
            <BookOpenCheck className="w-5 h-5" /> Student Library Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-1">
            Biochemistry Learning Portal
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Browse learning materials, handouts, and exam files categorized strictly by study level, semester, and course folders.
          </p>
        </div>
        <Link 
          href="/past-questions" 
          className="self-start md:self-auto px-5 py-2.5 bg-accent hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-premium shadow-md shadow-accent/25 flex items-center gap-1.5"
        >
          <FileText className="w-4.5 h-4.5" /> Search Past Questions &rarr;
        </Link>
      </div>

      {/* Breadcrumbs Navigation */}
      {renderBreadcrumbs()}

      {/* EXPLORER AREA */}
      <div className="bg-slate-50/50 rounded-3xl p-6 sm:p-8 border border-slate-200 min-h-[40vh] flex flex-col justify-between">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 my-auto">
            <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-secondary"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold">Loading directory cache...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* SCREEN 1: SELECT LEVEL */}
            {!selectedLevel && (
              <div className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-extrabold text-slate-800">Select Directory Folder</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Please choose an academic level or general folder to open its directories.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {levels.map((lvl) => {
                    const count = getLevelCount(lvl.key);
                    return (
                      <div
                        key={lvl.key}
                        onClick={() => handleLevelSelect(lvl.key)}
                        className="bg-white border border-slate-250 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-secondary transition-premium cursor-pointer group flex flex-col justify-between h-[180px]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-secondary group-hover:text-white group-hover:border-secondary transition-premium shrink-0">
                            <Folder className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full group-hover:bg-slate-200/60 transition-premium">
                            {count} {count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        <div className="space-y-1 mt-4">
                          <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-secondary transition-colors">
                            {lvl.label}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-light leading-normal line-clamp-2">
                            {lvl.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN 2: SELECT SEMESTER */}
            {selectedLevel && selectedLevel !== 'misc' && !selectedSemester && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <button onClick={handleReset} className="p-1 rounded bg-slate-105 hover:bg-slate-200 text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      Select Semester
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select a semester under {selectedLevel === 'misc' ? 'Miscellaneous' : `${selectedLevel} Level`} directory.</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="self-start sm:self-auto text-xs font-bold text-slate-500 hover:text-secondary flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm"
                  >
                    &larr; Back to Root
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto py-4">
                  {semesters.map((sem) => {
                    const count = getSemesterCount(selectedLevel, sem.key);
                    return (
                      <div
                        key={sem.key}
                        onClick={() => handleSemesterSelect(sem.key)}
                        className="bg-white border border-slate-250 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:border-secondary transition-premium cursor-pointer group flex flex-col justify-between h-[200px]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-secondary group-hover:text-white group-hover:border-secondary transition-premium shrink-0">
                            <FolderOpen className="w-7 h-7" />
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            {count} {count === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        <div className="space-y-1 mt-6">
                          <h4 className="font-extrabold text-slate-800 text-base group-hover:text-secondary transition-colors">
                            {sem.label}
                          </h4>
                          <p className="text-xs text-slate-500 font-light leading-normal">
                            {sem.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCREEN 3: SELECT COURSE CODE */}
            {selectedLevel && selectedLevel !== 'misc' && selectedSemester && !selectedCourseFolder && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <button 
                        onClick={() => { setSelectedSemester(null); setSearchQuery(''); }} 
                        className="p-1 rounded bg-slate-105 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      Select Course Directory
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Browse syllabus folders in {selectedLevel}L &bull; {selectedSemester} Semester.</p>
                  </div>
                  <button
                    onClick={() => { setSelectedSemester(null); setSearchQuery(''); }}
                    className="self-start sm:self-auto text-xs font-bold text-slate-500 hover:text-secondary flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm"
                  >
                    &larr; Back to Semesters
                  </button>
                </div>

                {courses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-base">Directory Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        No learning resources or exam papers have been uploaded for {selectedLevel} Level, {selectedSemester} Semester yet.
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-premium"
                    >
                      Back to Library Root
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {courses.map((courseCode) => {
                      const count = getCourseCount(courseCode);
                      return (
                        <div
                          key={courseCode}
                          onClick={() => handleCourseSelect(courseCode)}
                          className="bg-white border border-slate-250 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-secondary transition-premium cursor-pointer group flex flex-col justify-between h-[160px]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-secondary group-hover:text-white group-hover:border-secondary transition-premium shrink-0">
                              <Folder className="w-5.5 h-5.5" />
                            </div>
                            <span className="text-[10px] font-extrabold text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg">
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="mt-4">
                            <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-secondary transition-colors">
                              {courseCode} Directory
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Learning materials & exam files
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 4: COURSE MATERIALS LISTING */}
            {((selectedLevel === 'misc') || (selectedLevel && selectedLevel !== 'misc' && selectedSemester && selectedCourseFolder)) && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <button 
                        onClick={() => {
                          if (selectedLevel === 'misc') {
                            handleReset();
                          } else {
                            setSelectedCourseFolder(null);
                            setSearchQuery('');
                          }
                        }} 
                        className="p-1 rounded bg-slate-105 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      Directory: {selectedLevel === 'misc' ? 'Miscellaneous' : selectedCourseFolder}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedLevel === 'misc' ? 'General library handbooks, student constitution guidelines, and career documents.' : 'Lecture slide handouts, textbook PDFs, lab slides, and past papers.'}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      onClick={() => {
                        if (selectedLevel === 'misc') {
                          handleReset();
                        } else {
                          setSelectedCourseFolder(null);
                          setSearchQuery('');
                        }
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-secondary flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm transition-colors cursor-pointer"
                    >
                      &larr; Back to {selectedLevel === 'misc' ? 'Root' : 'Folders'}
                    </button>
                  </div>
                </div>

                {/* Local search inside directory */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={selectedLevel === 'misc' ? "Search within Miscellaneous folder (e.g. handbook, career)..." : `Search within ${selectedCourseFolder} folder (e.g. topic, syllabus item)...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-xs shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {filesInFolder.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-base">
                        {searchQuery ? 'No Matching Files' : 'Folder is Empty'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {searchQuery
                          ? `No files in the ${selectedCourseFolder} directory match your search keywords.`
                          : `No files have been uploaded to the ${selectedCourseFolder} directory yet.`
                        }
                      </p>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-premium"
                      >
                        Reset Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {filesInFolder.map((item: any) => (
                      <div 
                        key={item.id} 
                        className={`bg-white rounded-3xl p-6 border border-slate-200 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-premium relative overflow-hidden group`}
                      >
                        {item.isPastQuestion && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white font-extrabold text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                            Exam PQ
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${item.isPastQuestion ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              {item.isPastQuestion ? <FileText className="w-5.5 h-5.5" /> : <File className="w-5.5 h-5.5" />}
                            </div>
                            <div>
                              <span className="inline-block text-[9px] font-extrabold text-secondary bg-secondary/10 px-2 py-0.5 rounded uppercase">
                                {item.course_code}
                              </span>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                {item.level}L &bull; {item.semester} Semester
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1 group-hover:text-secondary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 pt-5 mt-5 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400">
                            Format: <span className="font-extrabold text-slate-500">{item.file_type}</span> ({item.file_size})
                          </div>
                          <button
                            onClick={() => handleDownload(item.id, item.file_url, item.title)}
                            disabled={downloadingId === item.id}
                            className="px-4 py-2 bg-primary hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm transition-premium flex items-center gap-1 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                          >
                            {downloadingId === item.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
